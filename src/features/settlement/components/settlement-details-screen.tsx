"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { describeWorkError } from "@/features/home/model/messages";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { useSettlementDetails } from "../hooks/settlement-queries";
import {
  DETAIL_COLUMNS,
  METRIC_LABEL,
  detailRowHref,
  detailValueText,
  isMetricName,
  isYearMonth,
} from "../model/metrics";
import type { DetailColumn } from "../model/metrics";

function cell(column: DetailColumn, raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "-";
  if (column.kind === "money" && typeof raw === "number") return formatKrw(raw);
  if (column.kind === "date" && typeof raw === "string") return formatSeoulDate(raw);
  if (column.kind === "datetime" && typeof raw === "string") return formatSeoulDateTime(raw);
  return detailValueText(column, raw);
}

export function SettlementDetailsScreen({ yearMonth }: { yearMonth: string }) {
  const { role } = useOfficeAccess();
  const params = useSearchParams();
  const metric = params.get("metric");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const valid = isYearMonth(yearMonth) && isMetricName(metric);
  const query = useSettlementDetails(yearMonth, valid ? metric : "", page - 1, size, valid);

  if (role === "DEPUTY") return <ErrorScreen kind="forbidden" />;
  if (!valid) return <ErrorScreen kind="not-found" />;
  if (
    query.isError &&
    query.error instanceof ApiError &&
    [403, 404, 429].includes(query.error.status)
  ) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(query.error)}
        retryAfterSeconds={query.error.retryAfterSeconds}
        onRetry={() => void query.refetch()}
      />
    );
  }
  const columns = DETAIL_COLUMNS[metric] ?? [];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${METRIC_LABEL[metric]} 상세 내역`}
        description={`${yearMonth.replace("-", "년 ")}월 지표의 원본 목록입니다.`}
        actions={
          <Link
            href={`/settlements?month=${yearMonth}`}
            className="inline-flex h-12 items-center rounded-control border border-line px-5 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
          >
            월말결산으로 돌아가기
          </Link>
        }
      />
      <DataTable
        caption={`${METRIC_LABEL[metric]} 상세 내역`}
        rows={query.data?.items ?? []}
        getRowId={(row) => JSON.stringify(row)}
        totalCount={query.data?.totalElements ?? 0}
        page={page}
        pageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setSize(next);
          setPage(1);
        }}
        isLoading={query.isPending}
        errorMessage={
          query.isError
            ? describeWorkError(query.error, "상세 내역을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage="이 지표에 해당하는 내역이 없습니다."
        columns={[
          ...columns.map((column, index) => ({
            key: column.key,
            header: column.header,
            render: (row: Record<string, unknown>) => {
              const text = cell(column, row[column.key]);
              const href = index === 0 ? detailRowHref(metric, row) : null;
              return href ? (
                <Link
                  href={href}
                  className="font-semibold text-ink hover:text-primary hover:underline"
                >
                  {text}
                </Link>
              ) : (
                text
              );
            },
          })),
        ]}
      />
    </div>
  );
}
