"use client";

import Link from "next/link";
import { useState } from "react";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useIntakeList } from "./intake-api";
import {
  DRAFT_NOTICE,
  INTAKE_STATUS,
  REQUESTER_ROLE_LABELS,
  REQUEST_TYPE_LABELS,
  VERIFICATION_STATUS,
} from "./intake-model";

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  ...Object.entries(INTAKE_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

export function IntakeListScreen() {
  const [draft, setDraft] = useState({ status: "", officeId: "" });
  const [applied, setApplied] = useState({ status: "", officeId: "" });
  const paging = useOpsPaging();
  const query = useIntakeList({ ...applied, page: paging.page, size: paging.size });

  return (
    <OpsScreen
      title="비회원 권리 요청"
      description="승인자 링크 등으로 접수된 비회원의 개인정보 권리 요청을 확인하고 전환하거나 종결합니다."
      roles={["PRIVACY"]}
    >
      <p
        role="note"
        className="rounded-card-flat border border-line bg-white px-4 py-3 text-caption text-ink-2"
      >
        {DRAFT_NOTICE}
      </p>
      <OpsFilterBar
        label="비회원 권리 요청 조회"
        onApply={() => {
          setApplied(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft({ status: "", officeId: "" });
          setApplied({ status: "", officeId: "" });
          paging.resetPage();
        }}
      >
        <SelectField
          label="접수 상태"
          value={draft.status}
          options={STATUS_OPTIONS}
          onValueChange={(status) => setDraft((current) => ({ ...current, status }))}
        />
        <TextField
          label="링크 발급 사무소 번호"
          kind="number"
          value={draft.officeId}
          onValueChange={(officeId) => setDraft((current) => ({ ...current, officeId }))}
        />
      </OpsFilterBar>
      <OpsTable
        caption="비회원 권리 요청 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.intakeId)}
        emptyMessage="접수된 비회원 권리 요청이 없습니다."
        columns={[
          {
            key: "id",
            header: "접수 번호",
            render: (row) => (
              <Link
                href={`/ops/guest-privacy-intakes/${row.intakeId}`}
                className="font-semibold text-primary underline"
              >
                {row.intakeId}
              </Link>
            ),
          },
          {
            key: "type",
            header: "요청 종류",
            render: (row) => REQUEST_TYPE_LABELS[row.requestType] ?? row.requestType,
          },
          {
            key: "role",
            header: "요청자 구분",
            render: (row) => REQUESTER_ROLE_LABELS[row.requesterRole] ?? row.requesterRole,
          },
          {
            key: "receivedAt",
            header: "접수 시각",
            render: (row) => formatSeoulDateTime(row.receivedAt),
          },
          {
            key: "dueAt",
            header: "목표 기한",
            render: (row) => formatSeoulDateTime(row.internalDueAt),
          },
          {
            key: "verification",
            header: "본인 확인",
            render: (row) => (
              <OpsStatusBadge status={row.verificationStatus} map={VERIFICATION_STATUS} />
            ),
          },
          { key: "office", header: "링크 발급 사무소", render: (row) => row.officeName },
          {
            key: "status",
            header: "접수 상태",
            render: (row) => <OpsStatusBadge status={row.status} map={INTAKE_STATUS} />,
          },
        ]}
      />
    </OpsScreen>
  );
}
