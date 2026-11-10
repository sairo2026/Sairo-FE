"use client";

import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { useAssistantSupervision } from "../hooks/follow-queries";
import { NOTICE_RECIPIENT_LABEL, labelOf } from "../model/labels";

export function SupervisionScreen() {
  const { role } = useOfficeAccess();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const query = useAssistantSupervision(page - 1, size);
  if (role !== "OWNER") {
    return (
      <ErrorScreen kind="forbidden" description="보조원 고지 감독 이력은 대표만 볼 수 있습니다." />
    );
  }
  if (query.isError && query.error instanceof ApiError && [403, 429].includes(query.error.status)) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(query.error)}
        traceId={query.error.traceId}
        retryAfterSeconds={query.error.retryAfterSeconds}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="보조원 고지 감독 이력"
        description="중개보조원이 기록한 신분 고지와 감독 확인 현황을 모아 봅니다."
      />
      <DataTable
        caption="보조원 고지 감독 이력"
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.noticeId)}
        totalCount={query.data?.totalElements ?? 0}
        page={page}
        pageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setSize(next);
          setPage(1);
        }}
        isLoading={query.isPending}
        errorMessage={query.isError ? "감독 이력을 불러오지 못했습니다." : undefined}
        onRetry={() => void query.refetch()}
        emptyMessage="기록된 보조원 고지가 없습니다."
        columns={[
          { key: "item", header: "방문 항목", render: (row) => `#${row.scheduleItemId}` },
          {
            key: "recipient",
            header: "고지 대상",
            render: (row) => labelOf(NOTICE_RECIPIENT_LABEL, row.recipientType),
          },
          {
            key: "notified",
            header: "고지 시각",
            render: (row) => (row.notifiedAt ? formatSeoulDateTime(row.notifiedAt) : "-"),
          },
          {
            key: "after",
            header: "사후 기록",
            render: (row) =>
              row.recordedAfterTheFact ? <Badge tone="amber">사후 기록</Badge> : "-",
          },
          {
            key: "confirmed",
            header: "감독 확인",
            render: (row) =>
              row.confirmedAt ? (
                <Badge tone="green">{formatSeoulDateTime(row.confirmedAt)}</Badge>
              ) : (
                <Badge tone="gray">확인 전</Badge>
              ),
          },
        ]}
      />
    </div>
  );
}
