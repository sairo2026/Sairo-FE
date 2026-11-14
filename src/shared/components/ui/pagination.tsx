"use client";

import { cn } from "@/shared/lib/cn";

export type PaginationProps = {
  label: string;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

const EDGE_PAGES = 1;
const SIBLING_PAGES = 1;

/** 현재 쪽 주변과 처음·끝 쪽만 보이고 나머지는 줄임표(null)로 접는다. */
export function pageItems(page: number, pageCount: number): Array<number | null> {
  const keep = new Set<number>();
  for (let n = 1; n <= Math.min(EDGE_PAGES, pageCount); n += 1) keep.add(n);
  for (let n = Math.max(1, pageCount - EDGE_PAGES + 1); n <= pageCount; n += 1) keep.add(n);
  for (let n = page - SIBLING_PAGES; n <= page + SIBLING_PAGES; n += 1) {
    if (n >= 1 && n <= pageCount) keep.add(n);
  }
  const sorted = [...keep].sort((a, b) => a - b);
  const items: Array<number | null> = [];
  let previous = 0;
  for (const n of sorted) {
    if (previous > 0 && n - previous > 1) items.push(null);
    items.push(n);
    previous = n;
  }
  return items;
}

const stepClass =
  "inline-flex h-9 min-w-[64px] items-center justify-center rounded-control border border-line bg-white px-3 text-caption font-medium text-ink-2 hover:border-primary hover:bg-primary-soft hover:text-primary active:bg-primary-line disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-3 disabled:hover:bg-surface disabled:hover:text-ink-3";

/** 이전·다음과 쪽 번호. 현재 쪽은 채움색과 aria-current로 구분한다. */
export function Pagination({ label, page, pageCount, onPageChange }: PaginationProps) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        className={stepClass}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        이전
      </button>
      <ol className="flex items-center gap-1.5">
        {pageItems(page, pageCount).map((item, index) =>
          item === null ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-ink-3">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={`${item}쪽`}
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-control px-2 text-caption tabular-nums",
                  item === page
                    ? "bg-primary font-semibold text-white"
                    : "border border-line bg-white font-medium text-ink-2 hover:border-primary hover:bg-primary-soft hover:text-primary active:bg-primary-line",
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ol>
      <button
        type="button"
        className={stepClass}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        다음
      </button>
    </nav>
  );
}
