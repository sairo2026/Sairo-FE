const ENUM_RUN = /`?[A-Z][A-Z0-9_]+`?(?:\s*\/\s*`?[A-Z][A-Z0-9_]+`?)+/;
const VALID_NAME = /^[A-Za-z_][A-Za-z0-9_]*(\[\])?(\.[A-Za-z_][A-Za-z0-9_]*(\[\])?)*$/;

export function normalizeType(rawType) {
  return rawType
    .replaceAll("\\", "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
}

export function extractEnumValues(constraint) {
  const run = ENUM_RUN.exec(constraint);
  if (!run) return null;
  return run[0].split("/").map((token) => token.replace(/`/g, "").trim());
}

function scalarExpression(type, constraint) {
  switch (type) {
    case "string": {
      const values = extractEnumValues(constraint);
      if (values) return `z.enum([${values.map((value) => JSON.stringify(value)).join(", ")}])`;
      return "z.string()";
    }
    case "number":
    case "integer":
    case "int64":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "datetime":
    case "date-time":
      return "z.iso.datetime({ offset: true })";
    case "date":
      return "z.iso.date()";
    case "time":
      return "z.string()";
    default:
      return null;
  }
}

export function typeExpression(rawType, constraint) {
  const type = normalizeType(rawType);
  const scalar = scalarExpression(type, constraint);
  if (scalar) return { expression: scalar, known: true };

  const arrayMatch = /^array<(.+)>$/.exec(type) ?? /^(.+)\[\]$/.exec(type);
  if (arrayMatch?.[1]) {
    const inner = typeExpression(arrayMatch[1], "");
    return { expression: `z.array(${inner.expression})`, known: inner.known };
  }
  if (type === "array") return { expression: "z.array(z.unknown())", known: true };
  if (type === "object") return { expression: "z.record(z.string(), z.unknown())", known: true };
  const record = /^object<string,\s*(.+)>$/.exec(type);
  if (record?.[1]) {
    const inner = typeExpression(record[1], "");
    return { expression: `z.record(z.string(), ${inner.expression})`, known: inner.known };
  }
  return { expression: "z.unknown()", known: false };
}

function isArrayType(rawType) {
  const type = normalizeType(rawType);
  return type === "array" || type.startsWith("array<") || type.endsWith("[]");
}

function buildTree(fields) {
  const root = { children: new Map() };
  for (const field of fields) {
    if (!VALID_NAME.test(field.name)) continue;
    const segments = field.name.split(".");
    let node = root;
    segments.forEach((segment, position) => {
      const isArraySegment = segment.endsWith("[]");
      const key = isArraySegment ? segment.slice(0, -2) : segment;
      let child = node.children.get(key);
      if (!child) {
        child = { key, children: new Map(), row: null, array: false };
        node.children.set(key, child);
      }
      if (isArraySegment) child.array = true;
      if (position === segments.length - 1) child.row = field;
      node = child;
    });
  }
  return root;
}

function wrap(expression, row) {
  let result = expression;
  if (row.nullable.startsWith("예")) result += ".nullable()";
  const required = row.requirement.startsWith("필수") && !row.requirement.includes("조건부");
  if (!required) result += ".optional()";
  return result;
}

function emitNode(node, issues, dtoName, path) {
  const row = node.row ?? {
    type: "object",
    requirement: "필수",
    nullable: "아니오",
    constraint: "",
  };
  let base;
  if (node.children.size > 0) {
    const members = [...node.children.values()]
      .map((child) => `${child.key}: ${emitNode(child, issues, dtoName, `${path}.${child.key}`)}`)
      .join(", ");
    base = `z.object({ ${members} })`;
    if (node.array || isArrayType(row.type)) base = `z.array(${base})`;
  } else {
    const resolved = typeExpression(row.type, row.constraint);
    if (!resolved.known) issues.push(`${dtoName}.${path}: 알 수 없는 타입 ${row.type}`);
    base = resolved.expression;
  }
  return wrap(base, row);
}

export function emitDto(dto, issues = []) {
  const tree = buildTree(dto.fields);
  const members = [...tree.children.values()].map(
    (child) => `${child.key}: ${emitNode(child, issues, dto.name, child.key)}`,
  );
  const schemaName = `${dto.name}Schema`;
  return [
    `export const ${schemaName} = z.object({ ${members.join(", ")} });`,
    `export type ${dto.name} = z.infer<typeof ${schemaName}>;`,
  ].join("\n");
}

export function emitModule(dtos, issues = []) {
  const header = [
    "// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.",
    'import { z } from "zod";',
  ].join("\n");
  const body = dtos.map((dto) => emitDto(dto, issues)).join("\n\n");
  return `${header}\n\n${body}\n`;
}

export function applyEnumHints(dto, hints) {
  const fields = dto.fields.map((field) => {
    const hint = hints[`${dto.name}.${field.name}`];
    if (!hint || extractEnumValues(field.constraint)) return field;
    return { ...field, constraint: hint.join(" / ") };
  });
  return { ...dto, fields };
}
