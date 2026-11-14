const FIELD_TABLE_HEADER = "필드명";
const INDEX_HEADING = /^#{2,4}\s+27\.1\s/;
const DTO_HEADING = /^(#{3,4})\s+`?([A-Z][A-Za-z0-9]*)`?\s*$/;

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function headingLevel(line) {
  const match = /^(#{1,6})\s/.exec(line);
  return match ? match[1].length : 0;
}

export function parseFieldTables(lines) {
  const fields = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith("|") && splitRow(line)[0] === FIELD_TABLE_HEADER) {
      index += 2;
      while (index < lines.length && lines[index].startsWith("|")) {
        const cells = splitRow(lines[index]);
        if (cells.length >= 6) {
          fields.push({
            name: cells[0],
            type: cells[1],
            requirement: cells[2],
            nullable: cells[3],
            constraint: cells[4],
            description: cells.slice(5).join("|"),
          });
        }
        index += 1;
      }
      continue;
    }
    index += 1;
  }
  return fields;
}

export function parseDtoIndex(lines) {
  const start = lines.findIndex((line) => INDEX_HEADING.test(line));
  if (start === -1) return [];
  const entries = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("#")) break;
    if (!line.startsWith("| `")) continue;
    const cells = splitRow(line);
    const name = /`([A-Za-z0-9]+)`/.exec(cells[0])?.[1];
    if (!name) continue;
    const apis = [...cells[2].matchAll(/`([A-Z]+)\s+([^`]+)`/g)].map((m) => ({
      method: m[1],
      path: m[2],
    }));
    entries.push({
      name,
      kind: cells[1] === "요청" ? "request" : "response",
      apis,
      location: cells[3],
    });
  }
  return entries;
}

export function parseDtoSections(lines, names) {
  const sections = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    const heading = DTO_HEADING.exec(lines[i]);
    if (!heading) continue;
    const name = heading[2];
    if (!names.has(name)) continue;
    const level = heading[1].length;
    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const nextLevel = headingLevel(lines[j]);
      if (nextLevel > 0 && nextLevel <= level) break;
      body.push(lines[j]);
    }
    const fields = parseFieldTables(body);
    const existing = sections.get(name) ?? [];
    for (const field of fields) {
      const at = existing.findIndex((item) => item.name === field.name);
      if (at === -1) existing.push(field);
      else existing[at] = field;
    }
    sections.set(name, existing);
  }
  return sections;
}

export function parseSpec(markdown) {
  const lines = markdown.split(/\r?\n/);
  const index = parseDtoIndex(lines);
  const names = new Set(index.map((entry) => entry.name));
  const sections = parseDtoSections(lines, names);
  const dtos = new Map();
  for (const entry of index) {
    const existing = dtos.get(entry.name);
    if (existing) {
      existing.apis.push(...entry.apis);
      continue;
    }
    dtos.set(entry.name, {
      ...entry,
      apis: [...entry.apis],
      fields: sections.get(entry.name) ?? [],
    });
  }
  return dtos;
}
