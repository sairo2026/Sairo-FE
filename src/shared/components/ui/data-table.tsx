"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "./button";
import { Checkbox } from "./select-field";
import { formatCount } from "@/shared/lib/format";
import { Pagination } from "./pagination";
import { TableScroll } from "./table-scroll";

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const WIDE_TABLE_COLUMNS = 4;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export type SortDirection = "asc" | "desc";
export type SortState = { key: string; direction: SortDirection };

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  isSortable?: boolean;
  className?: string;
  /** 열 폭 클래스. 머리글과 칸에 함께 적용한다. */
  widthClass?: string;
  /** 숫자·금액 열은 오른쪽 정렬과 같은 폭 숫자를 쓴다. */
  align?: "left" | "right";
  /** 한 줄로 줄이고 넘치는 글은 말줄임으로 표시하며 전체 글은 title로 보여준다. */
  truncate?: boolean;
};

export type DataTableSelection<Row> = {
  /** 선택된 행 번호 모음. */
  selectedIds: ReadonlySet<string>;
  onToggleRow: (id: string) => void;
  /** 스크린리더가 읽는 행 선택 이름. */
  rowLabel: (row: Row) => string;
  disabled?: boolean;
};

export type DataTableProps<Row> = {
  caption: string;
  columns: DataTableColumn<Row>[];
  /** 서버가 현재 페이지와 정렬 기준으로 잘라서 준 행이다. */
  rows: Row[];
  getRowId: (row: Row) => string;
  totalCount: number;
  page: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  isLoading?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  /** 주면 행 전체가 그 주소로 들어가는 눌림 영역이 되고 호버 배경과 오른쪽 화살표가 붙는다. */
  getRowHref?: (row: Row) => string | undefined;
  /** 주면 맨 앞에 행 선택 체크박스 열이 붙는다. */
  selection?: DataTableSelection<Row>;
};

const TRUNCATE_WIDTH_CLASS = "max-w-[16rem]";

function cellContent<Row>(column: DataTableColumn<Row>, row: Row): ReactNode {
  const content = column.render(row);
  if (!column.truncate) return content;
  const title =
    typeof content === "string" || typeof content === "number" ? String(content) : undefined;
  return (
    <span title={title} className={cn("truncate-text", TRUNCATE_WIDTH_CLASS)}>
      {content}
    </span>
  );
}

export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowId,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sort,
  onSortChange,
  isLoading = false,
  errorMessage,
  onRetry,
  emptyMessage = "표시할 내용이 없습니다.",
  getRowHref,
  selection,
}: DataTableProps<Row>) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const holderRef = useRef<HTMLDivElement>(null);
  const [heldHeight, setHeldHeight] = useState(0);

  // 필터·토글로 다시 불러오는 동안 표가 자리표시 행 5개로 줄면 문서가 짧아져 브라우저가 스크롤 위치를 맨 위나 아래로 당긴다.
  // 마지막으로 그려진 높이를 로딩 중에도 유지해 스크롤 위치가 바뀌지 않게 한다.
  useEffect(() => {
    if (isLoading) return;
    const height = holderRef.current?.offsetHeight ?? 0;
    setHeldHeight((previous) => (previous === height ? previous : height));
  }, [isLoading, rows, errorMessage]);

  function handleSort(key: string) {
    if (!onSortChange) return;
    const isSame = sort?.key === key;
    onSortChange({ key, direction: isSame && sort.direction === "asc" ? "desc" : "asc" });
  }

  function ariaSort(key: string): "ascending" | "descending" | "none" {
    if (sort?.key !== key) return "none";
    return sort.direction === "asc" ? "ascending" : "descending";
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={isLoading || undefined}>
      <div ref={holderRef} style={isLoading && heldHeight ? { minHeight: heldHeight } : undefined}>
        <TableScroll label={caption} className="max-h-[70vh] bg-white">
          <table
            className={cn(
              "w-full border-collapse text-left",
              columns.length >= WIDE_TABLE_COLUMNS && "min-w-[40rem]",
            )}
          >
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {selection ? (
                  <th
                    scope="col"
                    className="sticky top-0 z-20 h-[60px] w-12 border-b border-brand-border bg-white py-0 pr-2"
                  >
                    <span className="sr-only">선택</span>
                  </th>
                ) : null}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={column.isSortable ? ariaSort(column.key) : undefined}
                    className={cn(
                      "sticky top-0 z-20 h-[60px] border-b border-brand-border bg-white py-0 pr-5 text-body font-bold text-ink",
                      column.widthClass,
                      column.align === "right" && "text-right",
                    )}
                  >
                    {column.isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="inline-flex items-center gap-1 hover:text-primary"
                      >
                        {column.header}
                        <span aria-hidden="true">
                          {sort?.key === column.key ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {errorMessage
                ? null
                : isLoading
                  ? Array.from({ length: 5 }, (_, index) => (
                      <tr key={`loading-${index}`} aria-hidden="true">
                        {selection ? <td className="w-12 py-4 pr-2" /> : null}
                        {columns.map((column) => (
                          <td key={column.key} className="py-4 pr-5">
                            <span className="block h-4 animate-pulse rounded-small bg-surface" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : rows.map((row) => {
                      const href = getRowHref?.(row);
                      return (
                        <tr
                          key={getRowId(row)}
                          className={cn(
                            "border-b border-primary-line last:border-b-0",
                            href && "clickable-table-row group relative",
                          )}
                        >
                          {selection ? (
                            <td className="relative z-10 h-[72px] w-12 py-0 pr-2">
                              <Checkbox
                                ariaLabel={selection.rowLabel(row)}
                                checked={selection.selectedIds.has(getRowId(row))}
                                disabled={selection.disabled}
                                onCheckedChange={() => selection.onToggleRow(getRowId(row))}
                              />
                            </td>
                          ) : null}
                          {columns.map((column, columnIndex) => (
                            <td
                              key={column.key}
                              className={cn(
                                "h-[72px] py-0 pr-5 text-body leading-none font-medium text-ink",
                                column.widthClass,
                                column.align === "right" && "text-right tabular-nums",
                                column.className,
                              )}
                            >
                              {href && columnIndex === 0 ? (
                                <Link
                                  href={href}
                                  aria-hidden="true"
                                  tabIndex={-1}
                                  className="absolute inset-0 z-0"
                                />
                              ) : null}
                              <div
                                className={cn(
                                  "flex items-center justify-between gap-3",
                                  href &&
                                    "pointer-events-none relative z-10 [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_label]:pointer-events-auto [&_select]:pointer-events-auto",
                                )}
                              >
                                <div
                                  className={cn(
                                    "min-w-0",
                                    column.align === "right" && "flex-1 text-right",
                                  )}
                                >
                                  {cellContent(column, row)}
                                </div>
                                {href && columnIndex === columns.length - 1 ? (
                                  <span aria-hidden="true" className="clickable-arrow">
                                    ›
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
            </tbody>
          </table>
          {isLoading ? (
            <p role="status" className="sr-only">
              불러오는 중입니다.
            </p>
          ) : null}
          {errorMessage ? (
            <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <p className="text-body text-ink">{errorMessage}</p>
              {onRetry ? (
                <Button variant="outlined" size="sm" onClick={onRetry}>
                  다시 시도
                </Button>
              ) : null}
            </div>
          ) : null}
          {!errorMessage && !isLoading && rows.length === 0 ? (
            <p className="px-4 py-12 text-center text-body text-ink-2">{emptyMessage}</p>
          ) : null}
        </TableScroll>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-caption text-ink-2">
        <p>총 {formatCount(totalCount)}건</p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            페이지당
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
              className="h-9 rounded-control border border-line bg-white px-2 text-ink"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}건
                </option>
              ))}
            </select>
          </label>
          <Pagination
            label={`${caption} 페이지 이동`}
            page={page}
            pageCount={pageCount}
            onPageChange={onPageChange}
          />
        </div>
      </div>
    </div>
  );
}
