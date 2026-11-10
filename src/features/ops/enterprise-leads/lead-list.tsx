"use client";

import Link from "next/link";
import { useState } from "react";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useLeadList } from "./lead-api";
import { LEAD_STATUS } from "./lead-model";

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  ...Object.entries(LEAD_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

type Filters = { status: string; assignedOperatorId: string; unassigned: boolean };
const EMPTY: Filters = { status: "", assignedOperatorId: "", unassigned: false };

export function LeadListScreen() {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const paging = useOpsPaging();
  const query = useLeadList({
    status: applied.status,
    assignedOperatorId: applied.assignedOperatorId,
    unassigned: applied.unassigned ? true : undefined,
    page: paging.page,
    size: paging.size,
  });
  const set = (patch: Partial<Filters>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <OpsScreen
      title="기업 도입 문의"
      description="기업 고객의 도입 문의를 상담하고 견적을 발행해 계약까지 기록합니다."
      roles={["SUPPORT"]}
    >
      <OpsFilterBar
        label="기업 도입 문의 조회"
        onApply={() => {
          setApplied(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft(EMPTY);
          setApplied(EMPTY);
          paging.resetPage();
        }}
      >
        <SelectField
          label="진행 상태"
          value={draft.status}
          options={STATUS_OPTIONS}
          onValueChange={(status) => set({ status })}
        />
        <TextField
          label="담당 운영자 번호"
          kind="number"
          value={draft.assignedOperatorId}
          onValueChange={(assignedOperatorId) => set({ assignedOperatorId })}
        />
        <Checkbox
          label="미배정만"
          checked={draft.unassigned}
          onCheckedChange={(unassigned) => set({ unassigned })}
        />
      </OpsFilterBar>
      <OpsTable
        caption="기업 도입 문의 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.leadId)}
        emptyMessage="조건에 맞는 기업 도입 문의가 없습니다."
        columns={[
          {
            key: "company",
            header: "기업명",
            render: (row) => (
              <Link
                href={`/ops/enterprise-leads/${row.leadId}`}
                className="font-semibold text-primary underline"
              >
                {row.companyName}
              </Link>
            ),
          },
          {
            key: "status",
            header: "진행 상태",
            render: (row) => <OpsStatusBadge status={row.status} map={LEAD_STATUS} />,
          },
          {
            key: "assignee",
            header: "담당",
            render: (row) => row.assignedOperatorName ?? "미배정",
          },
          { key: "contact", header: "담당자", render: (row) => row.contactName },
          {
            key: "scale",
            header: "지점·인원",
            render: (row) => `${row.branchCount}개 지점 · ${row.expectedSeats}명`,
          },
          {
            key: "quote",
            header: "최신 견적",
            render: (row) =>
              row.quoteAmount === null
                ? "-"
                : `${formatKrw(row.quoteAmount)}${
                    row.quoteExpiresAt ? ` (유효 ${formatSeoulDateTime(row.quoteExpiresAt)})` : ""
                  }`,
          },
          {
            key: "createdAt",
            header: "접수 시각",
            render: (row) => formatSeoulDateTime(row.createdAt),
          },
        ]}
      />
    </OpsScreen>
  );
}
