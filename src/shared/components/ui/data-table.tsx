"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "./button";

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export type SortDirection = "asc" | "desc";
export type SortState = { key: string; direction: SortDirection };

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  isSortable?: boolean;
  className?: string;
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
};

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
}: DataTableProps<Row>) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

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
      <div className="overflow-x-auto rounded-card-flat border border-line bg-white">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.isSortable ? ariaSort(column.key) : undefined}
                  className="border-b border-line bg-surface px-4 py-3.5 text-caption font-semibold text-ink-2"
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
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-4">
                          <span className="block h-4 animate-pulse rounded-small bg-surface" />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((row) => (
                    <tr key={getRowId(row)} className="border-b border-line last:border-b-0">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn("px-4 py-4 text-body text-ink", column.className)}
                        >
                          {column.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
          </tbody>
        </table>
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-caption text-ink-2">
        <p>총 {totalCount.toLocaleString("ko-KR")}건</p>
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
          <nav aria-label="페이지 이동" className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              이전
            </Button>
            <span aria-live="polite">
              {page} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
            >
              다음
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
}
