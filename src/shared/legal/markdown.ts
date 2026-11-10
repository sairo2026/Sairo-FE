export type MarkdownListItem = { marker: string; text: string; children: string[] };

export type MarkdownBlock =
  | { type: "heading"; level: 3 | 4; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; isOrdered: boolean; items: MarkdownListItem[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "rule" };

const HEADING = /^(#{3,4})\s+(.+)$/;
const ORDERED_ITEM = /^(\d+)\.\s+(.*)$/;
const BULLET_ITEM = /^-\s+(.*)$/;
const NESTED_BULLET = /^\s{2,}-\s+(.*)$/;
const TABLE_ROW = /^\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\|(\s*:?-{3,}:?\s*\|)+\s*$/;

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function lineAt(lines: string[], index: number): string {
  return lines[index] ?? "";
}

function nextNonBlank(lines: string[], from: number): string {
  for (let index = from; index < lines.length; index += 1) {
    const line = lineAt(lines, index);
    if (line.trim() !== "") return line.trim();
  }
  return "";
}

function parseList(lines: string[], start: number): { block: MarkdownBlock; next: number } {
  const isOrdered = ORDERED_ITEM.test(lineAt(lines, start).trim());
  const itemPattern = isOrdered ? ORDERED_ITEM : BULLET_ITEM;
  const items: MarkdownListItem[] = [];
  let index = start;
  while (index < lines.length) {
    const current = lineAt(lines, index);
    if (current.trim() === "") {
      if (!itemPattern.test(nextNonBlank(lines, index + 1))) break;
      index += 1;
      continue;
    }
    const nested = NESTED_BULLET.exec(current);
    const lastItem = items[items.length - 1];
    if (nested && lastItem) {
      lastItem.children.push(nested[1] ?? "");
      index += 1;
      continue;
    }
    const match = itemPattern.exec(current.trim());
    if (!match) break;
    items.push(
      isOrdered
        ? { marker: `${match[1] ?? ""}.`, text: match[2] ?? "", children: [] }
        : { marker: "", text: match[1] ?? "", children: [] },
    );
    index += 1;
  }
  return { block: { type: "list", isOrdered, items }, next: index };
}

export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length > 0) blocks.push({ type: "paragraph", lines: paragraph });
    paragraph = [];
  }

  let index = 0;
  while (index < lines.length) {
    const line = lineAt(lines, index);
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph();
      index += 1;
      continue;
    }
    if (trimmed === "---") {
      flushParagraph();
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }
    const heading = HEADING.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: (heading[1] ?? "").length === 3 ? 3 : 4,
        text: heading[2] ?? "",
      });
      index += 1;
      continue;
    }
    if (TABLE_ROW.test(trimmed) && TABLE_SEPARATOR.test(lineAt(lines, index + 1).trim())) {
      flushParagraph();
      const header = splitTableRow(trimmed);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && TABLE_ROW.test(lineAt(lines, index).trim())) {
        rows.push(splitTableRow(lineAt(lines, index)));
        index += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }
    const isListStart = ORDERED_ITEM.test(trimmed) || BULLET_ITEM.test(trimmed);
    if (isListStart && !NESTED_BULLET.test(line)) {
      flushParagraph();
      const parsed = parseList(lines, index);
      blocks.push(parsed.block);
      index = parsed.next;
      continue;
    }
    paragraph.push(trimmed);
    index += 1;
  }
  flushParagraph();
  return blocks;
}

export function pruneEmptyBlocks(blocks: MarkdownBlock[]): MarkdownBlock[] {
  const kept = blocks.filter((block) => block.type !== "table" || block.rows.length > 0);
  const pruned = kept.filter((block, index) => {
    if (block.type !== "heading") return true;
    const next = kept[index + 1];
    if (next === undefined || next.type === "rule") return false;
    return next.type !== "heading" || next.level > block.level;
  });
  while (pruned[pruned.length - 1]?.type === "rule") pruned.pop();
  return pruned;
}
