"use client";

import Link from "next/link";
import { useState } from "react";
import { SelectField } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { usePrivacyList } from "./privacy-api";
import {
  DUE_STATE,
  DUE_STATE_HELP,
  IDENTITY_STATUS,
  PRIVACY_STATUS,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_OPTIONS,
  STATUS_OPTIONS,
} from "./privacy-model";

const EMPTY_FILTER = { status: "", requestType: "" };

function PrivacyTable() {
  const [draft, setDraft] = useState(EMPTY_FILTER);
  const [applied, setApplied] = useState(EMPTY_FILTER);
  const paging = useOpsPaging();
  const query = usePrivacyList({ ...applied, page: paging.page, size: paging.size });

  return (
    <div className="flex flex-col gap-4">
      <OpsFilterBar
        label="개인정보 요청 조회"
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
          label="요청 유형"
          value={draft.requestType}
          options={REQUEST_TYPE_OPTIONS}
          onValueChange={(requestType) => setDraft({ ...draft, requestType })}
        />
        <SelectField
          label="처리 상태"
          value={draft.status}
          options={STATUS_OPTIONS}
          onValueChange={(status) => setDraft({ ...draft, status })}
        />
      </OpsFilterBar>
      <p className="text-caption text-ink-2">{DUE_STATE_HELP}</p>
      <OpsTable
        caption="개인정보 권리 요청 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.requestId)}
        emptyMessage="처리할 개인정보 요청이 없습니다."
        columns={[
          {
            key: "id",
            header: "요청 번호",
            render: (row) => (
              <Link
                href={`/ops/privacy-requests/${row.requestId}`}
                className="font-semibold text-primary underline"
              >
                {row.requestId}
              </Link>
            ),
          },
          {
            key: "type",
            header: "요청 유형",
            render: (row) => REQUEST_TYPE_LABELS[row.requestType] ?? row.requestType,
          },
          {
            key: "identity",
            header: "본인확인",
            render: (row) => <OpsStatusBadge status={row.identityStatus} map={IDENTITY_STATUS} />,
          },
          {
            key: "status",
            header: "처리 상태",
            render: (row) => <OpsStatusBadge status={row.status} map={PRIVACY_STATUS} />,
          },
          {
            key: "office",
            header: "책임 사무소",
            render: (row) => (row.officeId === null ? "사이로" : row.officeId),
          },
          {
            key: "receivedAt",
            header: "접수일",
            render: (row) => formatSeoulDateTime(row.receivedAt),
          },
          { key: "basis", header: "적용 근거", render: (row) => row.legalBasis },
          {
            key: "legalDue",
            header: "법정 기한",
            render: (row) => formatSeoulDateTime(row.legalDueAt),
          },
          {
            key: "internalDue",
            header: "내부 기한",
            render: (row) => formatSeoulDateTime(row.internalDueAt),
          },
          {
            key: "dueState",
            header: "기한 상태",
            render: (row) =>
              row.dueState === null ? (
                "-"
              ) : (
                <OpsStatusBadge status={row.dueState} map={DUE_STATE} />
              ),
          },
          { key: "assignee", header: "담당", render: (row) => row.assignedOperatorName ?? "-" },
        ]}
      />
    </div>
  );
}

export function PrivacyQueueScreen() {
  return (
    <OpsScreen
      title="개인정보 요청"
      description="개인정보 권리 요청을 기한 안에 처리합니다."
      roles={["PRIVACY"]}
      actions={
        <Link
          href="/ops/privacy-requests/grants"
          className="text-body font-semibold text-primary underline"
        >
          반환·보관 권한 현황
        </Link>
      }
    >
      <PrivacyTable />
    </OpsScreen>
  );
}
