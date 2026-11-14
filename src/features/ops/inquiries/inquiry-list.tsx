"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OperatorSelect } from "../components/common/operator-select";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useInquiryList } from "./inquiry-api";
import { CATEGORY_LABELS, INQUIRY_STATUS, PRIORITY_STATUS, isOverdue } from "./inquiry-model";

type Filters = {
  category: string;
  status: string;
  priority: string;
  assignedOperatorId: string;
  officeId: string;
  unassigned: boolean;
  overdue: boolean;
};

const EMPTY_FILTERS: Filters = {
  category: "",
  status: "",
  priority: "",
  assignedOperatorId: "",
  officeId: "",
  unassigned: false,
  overdue: false,
};

function options(labels: Record<string, string>, all: string) {
  return [
    { value: "", label: all },
    ...Object.entries(labels).map(([value, label]) => ({ value, label })),
  ];
}

const CATEGORY_OPTIONS = options(CATEGORY_LABELS, "전체 유형");
const STATUS_OPTIONS = options(
  Object.fromEntries(Object.entries(INQUIRY_STATUS).map(([key, value]) => [key, value.label])),
  "전체 상태",
);
const PRIORITY_OPTIONS = options(
  Object.fromEntries(Object.entries(PRIORITY_STATUS).map(([key, value]) => [key, value.label])),
  "전체 우선순위",
);

export function InquiryListScreen() {
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const paging = useOpsPaging();
  const [now] = useState(() => Date.now());
  const query = useInquiryList({
    category: applied.category,
    status: applied.status,
    priority: applied.priority,
    assignedOperatorId: applied.assignedOperatorId,
    officeId: applied.officeId,
    unassigned: applied.unassigned ? true : undefined,
    overdue: applied.overdue ? true : undefined,
    page: paging.page,
    size: paging.size,
  });
  const set = (patch: Partial<Filters>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <OpsScreen
      title="문의·티켓"
      description="고객이 보낸 문의를 확인하고 담당을 배정해 답변합니다."
      roles={["SUPPORT"]}
    >
      <OpsFilterBar
        label="문의 조회"
        onApply={() => {
          setApplied(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft(EMPTY_FILTERS);
          setApplied(EMPTY_FILTERS);
          paging.resetPage();
        }}
      >
        <SelectField
          label="문의 유형"
          value={draft.category}
          options={CATEGORY_OPTIONS}
          onValueChange={(category) => set({ category })}
        />
        <SelectField
          label="상태"
          value={draft.status}
          options={STATUS_OPTIONS}
          onValueChange={(status) => set({ status })}
        />
        <SelectField
          label="우선순위"
          value={draft.priority}
          options={PRIORITY_OPTIONS}
          onValueChange={(priority) => set({ priority })}
        />
        <OperatorSelect
          label="담당 운영자"
          value={draft.assignedOperatorId}
          onValueChange={(assignedOperatorId) => set({ assignedOperatorId })}
          emptyLabel="전체 담당"
        />
        <TextField
          label="사무소 번호"
          kind="number"
          value={draft.officeId}
          onValueChange={(officeId) => set({ officeId })}
        />
        <Checkbox
          label="미배정만"
          checked={draft.unassigned}
          onCheckedChange={(unassigned) => set({ unassigned })}
        />
        <Checkbox
          label="기한 초과만"
          checked={draft.overdue}
          onCheckedChange={(overdue) => set({ overdue })}
        />
      </OpsFilterBar>
      <p className="text-caption text-ink-2">
        기한 초과는 첫 답변 목표 시각이 지났는데 공개 답변이 없는 문의입니다.
      </p>
      <OpsTable
        caption="문의 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.inquiryId)}
        emptyMessage="조건에 맞는 문의가 없습니다."
        columns={[
          {
            key: "id",
            header: "문의 번호",
            render: (row) => (
              <Link
                href={`/ops/inquiries/${row.inquiryId}`}
                className="font-semibold text-primary underline"
              >
                {row.inquiryId}
              </Link>
            ),
          },
          { key: "category", header: "유형", render: (row) => CATEGORY_LABELS[row.category] },
          { key: "office", header: "사무소", render: (row) => row.officeName ?? "사무소 없음" },
          { key: "author", header: "작성자", render: (row) => row.authorDisplayName },
          {
            key: "status",
            header: "상태",
            render: (row) => (
              <span className="inline-flex items-center gap-2">
                <OpsStatusBadge status={row.status} map={INQUIRY_STATUS} />
                {isOverdue(row, now) ? <Badge tone="red">기한 초과</Badge> : null}
              </span>
            ),
          },
          {
            key: "priority",
            header: "우선순위",
            render: (row) => <OpsStatusBadge status={row.priority} map={PRIORITY_STATUS} />,
          },
          {
            key: "assignee",
            header: "담당",
            render: (row) => row.assignedOperatorName ?? "미배정",
          },
          {
            key: "createdAt",
            header: "접수 시각",
            render: (row) => formatSeoulDateTime(row.createdAt),
          },
          {
            key: "due",
            header: "첫 답변 목표",
            render: (row) => formatSeoulDateTime(row.responseDueAt),
          },
        ]}
      />
    </OpsScreen>
  );
}
