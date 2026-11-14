"use client";

import Link from "next/link";
import { useState } from "react";
import { SelectField } from "@/shared/components/ui/select-field";
import { formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useImportSupportList } from "./import-support-api";
import {
  ASSIGNEE_FILTER_OPTIONS,
  IMPORT_SUPPORT_STATUS,
  STATUS_FILTER_OPTIONS,
} from "./import-support-model";

const EMPTY_FILTER = { status: "", assignedToMe: "" };

function ImportSupportTable() {
  const [draft, setDraft] = useState(EMPTY_FILTER);
  const [applied, setApplied] = useState(EMPTY_FILTER);
  const paging = useOpsPaging();
  const query = useImportSupportList({ ...applied, page: paging.page, size: paging.size });

  return (
    <div className="flex flex-col gap-4">
      <OpsFilterBar
        label="이전 지원 신청 조회"
        onApply={() => {
          setApplied(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft(EMPTY_FILTER);
          setApplied(EMPTY_FILTER);
          paging.resetPage();
        }}
      >
        <SelectField
          label="상태"
          value={draft.status}
          options={STATUS_FILTER_OPTIONS}
          onValueChange={(status) => setDraft({ ...draft, status })}
        />
        <SelectField
          label="담당"
          value={draft.assignedToMe}
          options={ASSIGNEE_FILTER_OPTIONS}
          onValueChange={(assignedToMe) => setDraft({ ...draft, assignedToMe })}
        />
      </OpsFilterBar>
      <OpsTable
        caption="이전 지원 신청 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.requestId)}
        emptyMessage="조건에 맞는 이전 지원 신청이 없습니다."
        columns={[
          {
            key: "id",
            header: "신청 번호",
            render: (row) => (
              <Link
                href={`/ops/import-support/${row.requestId}`}
                className="font-semibold text-primary underline"
              >
                {row.requestId}
              </Link>
            ),
          },
          { key: "office", header: "사무소 번호", render: (row) => row.officeId },
          { key: "source", header: "원본 시스템", render: (row) => row.sourceSystem },
          {
            key: "rows",
            header: "예상 레코드",
            render: (row) =>
              row.estimatedRowCount === null ? "-" : row.estimatedRowCount.toLocaleString("ko-KR"),
          },
          {
            key: "quote",
            header: "견적 금액",
            render: (row) => (row.quoteAmount === null ? "-" : formatKrw(row.quoteAmount)),
          },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={IMPORT_SUPPORT_STATUS} />,
          },
          {
            key: "assignee",
            header: "담당",
            render: (row) => row.assignedOperatorName ?? "-",
          },
          {
            key: "requestedAt",
            header: "신청 일시",
            render: (row) => formatSeoulDateTime(row.requestedAt),
          },
        ]}
      />
    </div>
  );
}

export function ImportSupportListScreen() {
  return (
    <OpsScreen
      title="이전 지원 처리"
      description="유료로 신청된 데이터 이전을 대신 처리합니다."
      roles={["MIGRATION"]}
    >
      <ImportSupportTable />
    </OpsScreen>
  );
}
