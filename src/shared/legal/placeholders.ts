export type LegalValues = Readonly<Record<string, string | undefined>>;

const TOKEN = /\{([^{}]+)\}/g;
const HAS_TOKEN = /\{[^{}]+\}/;
const SEGMENT_SEPARATOR = /(, | \/ )/;

function hasUnresolved(text: string, values: LegalValues): boolean {
  return Array.from(text.matchAll(TOKEN)).some((match) => !values[match[1] ?? ""]);
}

function fill(text: string, values: LegalValues): string {
  return text.replace(TOKEN, (token, name: string) => values[name] ?? token);
}

function resolveLine(line: string, values: LegalValues): string | null {
  if (!HAS_TOKEN.test(line)) return line;
  if (!hasUnresolved(line, values)) return fill(line, values);
  if (line.trimStart().startsWith("|")) return null;

  const indent = /^\s*/.exec(line)?.[0] ?? "";
  const marker = /^(-\s+|\d+\.\s+)?/.exec(line.slice(indent.length))?.[0] ?? "";
  const content = line.slice(indent.length + marker.length);
  const parts = content.split(SEGMENT_SEPARATOR);
  const kept: string[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    const segment = parts[index] ?? "";
    if (hasUnresolved(segment, values)) continue;
    if (kept.length > 0) kept.push(parts[index - 1] ?? ", ");
    kept.push(fill(segment, values));
  }
  return kept.length === 0 ? null : `${indent}${marker}${kept.join("")}`;
}

export function resolveLegalPlaceholders(source: string, values: LegalValues): string {
  const resolved: string[] = [];
  for (const line of source.replace(/\r\n/g, "\n").split("\n")) {
    const result = resolveLine(line, values);
    if (result !== null) resolved.push(result);
  }
  return resolved.join("\n");
}
