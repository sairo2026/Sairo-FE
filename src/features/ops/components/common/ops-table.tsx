"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "@/shared/components/ui/data-table";
import type { DataTableColumn, PageSize } from "@/shared/components/ui/data-table";
import { describeOpsError } from "../../model/ops-errors";

type PagedData<Row> = { items: Row[]; totalElements: number };

export function useOpsPaging(initialSize: PageSize = 25) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<PageSize>(initialSize);
  return {
    page,
    size,
    setPage,
    setSize: (next: PageSize) => {
      setSize(next);
      setPage(0);
    },
    resetPage: () => setPage(0),
  };
}

/** 서버 페이지 응답을 공통 표로 그린다. 로딩, 오류와 다시 시도, 빈 목록을 함께 처리한다. */
export function OpsTable<Row>({
  caption,
  query,
  columns,
  getRowId,
  paging,
  emptyMessage,
}: {
  caption: string;
  query: UseQueryResult<PagedData<Row>, unknown>;
  columns: DataTableColumn<Row>[];
  getRowId: (row: Row) => string;
  paging: ReturnType<typeof useOpsPaging>;
  emptyMessage?: string;
}) {
  return (
    <DataTable
      caption={caption}
      columns={columns}
      rows={query.data?.items ?? []}
      getRowId={getRowId}
      totalCount={query.data?.totalElements ?? 0}
      page={paging.page + 1}
      pageSize={paging.size}
      onPageChange={(next) => paging.setPage(next - 1)}
      onPageSizeChange={paging.setSize}
      isLoading={query.isPending}
      errorMessage={
        query.isError ? describeOpsError(query.error, "목록을 불러오지 못했습니다.") : undefined
      }
      onRetry={() => void query.refetch()}
      emptyMessage={emptyMessage}
    />
  );
}
