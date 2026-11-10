"use client";

import Link from "next/link";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useDeletionList } from "./deletion-api";
import { DELETION_PHASE, STORE_RESULT, phaseOf, targetTypeLabel } from "./deletion-model";
import type { DeletionItem } from "./deletion-model";

function resultBadge(value: string | null) {
  return value === null ? "-" : <OpsStatusBadge status={value} map={STORE_RESULT} />;
}

const STORE_COLUMNS: { key: string; header: string; pick: (row: DeletionItem) => string | null }[] =
  [
    { key: "storage", header: "운영 저장소", pick: (row) => row.storageResult },
    { key: "search", header: "검색 색인", pick: (row) => row.searchIndexResult },
    { key: "file", header: "파일", pick: (row) => row.fileResult },
    { key: "export", header: "임시 내보내기", pick: (row) => row.temporaryExportResult },
  ];

function DeletionTable() {
  const paging = useOpsPaging();
  const query = useDeletionList({ page: paging.page, size: paging.size });
  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-ink-2">
        실행을 마친 건도 실행자와 다른 운영자가 저장소별 결과를 검증하기 전에는 완료로 표시하지
        않습니다.
      </p>
      <OpsTable
        caption="파기 대상 큐"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.queueId)}
        emptyMessage="파기할 대상이 없습니다."
        columns={[
          {
            key: "id",
            header: "큐 번호",
            render: (row) => (
              <Link
                href={`/ops/deletion-queue/${row.queueId}`}
                className="font-semibold text-primary underline"
              >
                {row.queueId}
              </Link>
            ),
          },
          {
            key: "target",
            header: "대상",
            render: (row) => `${targetTypeLabel(row.targetType)} ${row.targetId}`,
          },
          { key: "reason", header: "근거", render: (row) => row.reason },
          {
            key: "scheduled",
            header: "예정일",
            render: (row) => formatSeoulDateTime(row.scheduledAt),
          },
          {
            key: "phase",
            header: "상태",
            render: (row) => <OpsStatusBadge status={phaseOf(row)} map={DELETION_PHASE} />,
          },
          ...STORE_COLUMNS.map((column) => ({
            key: column.key,
            header: column.header,
            render: (row: DeletionItem) => resultBadge(column.pick(row)),
          })),
          {
            key: "backup",
            header: "백업 만료",
            render: (row) => (row.backupExpiresAt ? formatSeoulDateTime(row.backupExpiresAt) : "-"),
          },
          { key: "retry", header: "재시도", render: (row) => `${row.retryCount}회` },
          {
            key: "cancelled",
            header: "취소 시각",
            render: (row) => (row.cancelledAt ? formatSeoulDateTime(row.cancelledAt) : "-"),
          },
        ]}
      />
    </div>
  );
}

export function DeletionQueueScreen() {
  return (
    <OpsScreen
      title="파기 큐"
      description="보관 기한이 지난 데이터를 미리보기 확인 뒤 파기하고 다른 운영자가 검증합니다."
      roles={["PRIVACY"]}
    >
      <DeletionTable />
    </OpsScreen>
  );
}
