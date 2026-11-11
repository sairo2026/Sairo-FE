import { Fragment } from "react";
import { cn } from "@/shared/lib/cn";
import { parseMarkdown, pruneEmptyBlocks } from "./markdown";
import type { MarkdownBlock } from "./markdown";
import { resolveLegalPlaceholders } from "./placeholders";
import type { LegalValues } from "./placeholders";

export type LegalTocEntry = { id: string; text: string };

export function prepareLegalBlocks(
  source: string,
  values: LegalValues,
  skipTitle = true,
): MarkdownBlock[] {
  const blocks = pruneEmptyBlocks(parseMarkdown(resolveLegalPlaceholders(source, values)));
  if (skipTitle && blocks[0]?.type === "heading" && blocks[0].level === 3) return blocks.slice(1);
  return blocks;
}

function headingLevelOffset(blocks: MarkdownBlock[]): number {
  const levels = blocks.flatMap((block) => (block.type === "heading" ? [block.level] : []));
  return levels.length === 0 ? 3 : Math.min(...levels);
}

export function legalTocEntries(blocks: MarkdownBlock[]): LegalTocEntry[] {
  const offset = headingLevelOffset(blocks);
  const entries: LegalTocEntry[] = [];
  blocks.forEach((block, index) => {
    if (block.type === "heading" && block.level === offset) {
      entries.push({ id: `legal-section-${index}`, text: block.text });
    }
  });
  return entries;
}

type LegalMarkdownProps = {
  blocks: MarkdownBlock[];
  isCompact?: boolean;
};

function tableCaption(blocks: MarkdownBlock[], index: number): string {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const block = blocks[cursor];
    if (block?.type === "heading") return `${block.text} 표`;
  }
  return "표";
}

export function LegalMarkdown({ blocks, isCompact = false }: LegalMarkdownProps) {
  const offset = headingLevelOffset(blocks);
  const bodyClass = isCompact ? "text-caption leading-6" : "text-body leading-7";
  return (
    <div className={cn("flex flex-col gap-3 text-ink", bodyClass)}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const isMajor = block.level === offset;
          const headingClass = cn(
            "font-semibold text-ink",
            isMajor ? "mt-5 text-h2" : "mt-3 text-body",
            isCompact && isMajor && "text-body",
          );
          const id = `legal-section-${index}`;
          return isMajor ? (
            <h2 key={index} id={id} className={headingClass}>
              {block.text}
            </h2>
          ) : (
            <h3 key={index} id={id} className={headingClass}>
              {block.text}
            </h3>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={index} className="whitespace-pre-line">
              {block.lines.join("\n")}
            </p>
          );
        }
        if (block.type === "rule") {
          return <hr key={index} className="border-line" />;
        }
        if (block.type === "table") {
          return (
            <div key={index} className="overflow-x-auto rounded-control border border-line">
              <table className="w-full min-w-[32rem] border-collapse text-left text-caption">
                <caption className="sr-only">{tableCaption(blocks, index)}</caption>
                <thead className="bg-surface">
                  <tr>
                    {block.header.map((cell) => (
                      <th key={cell} scope="col" className="px-3 py-2 font-semibold text-ink">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-line align-top">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 text-ink-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <ul key={index} className="flex flex-col gap-2">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-2">
                <span aria-hidden className="shrink-0 text-ink-2">
                  {item.marker || "·"}
                </span>
                <div className="flex flex-col gap-1">
                  <span>{item.text}</span>
                  {item.children.length > 0 ? (
                    <ul className="flex flex-col gap-1 text-ink-2">
                      {item.children.map((child, childIndex) => (
                        <Fragment key={childIndex}>
                          <li className="flex gap-2">
                            <span aria-hidden>-</span>
                            <span>{child}</span>
                          </li>
                        </Fragment>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
