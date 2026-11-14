"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { describeOpsError } from "../model/ops-errors";
import { useChangeRequestActions, useChangeRequestList } from "./registration-api";
import { CHANGE_STATUS, CHANGE_TYPE_LABELS, CHANGE_VALUE_LABELS } from "./registration-model";
import type { ChangeRequestItem } from "./registration-model";

const STATUS_OPTIONS = [
  { value: "", label: "심사 대기(기본)" },
  { value: "APPROVED", label: "승인" },
  { value: "REJECTED", label: "반려" },
];

function RequestedValues({ values }: { values: Record<string, unknown> }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {Object.entries(values).map(([key, value]) => (
        <li key={key}>
          <span className="text-ink-2">{CHANGE_VALUE_LABELS[key] ?? key}: </span>
          {typeof value === "string" || typeof value === "number" ? String(value) : "-"}
        </li>
      ))}
    </ul>
  );
}

export function ChangeRequestPanel() {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const paging = useOpsPaging();
  const query = useChangeRequestList({ status, page: paging.page, size: paging.size });
  const actions = useChangeRequestActions();
  const [approving, setApproving] = useState<ChangeRequestItem | null>(null);
  const [rejecting, setRejecting] = useState<ChangeRequestItem | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function approve() {
    if (!approving) return;
    try {
      await actions.approve.mutateAsync(approving.requestId);
      setMessage({ tone: "ok", text: "변경 신청을 승인했습니다." });
    } catch (error) {
      setMessage({ tone: "error", text: describeOpsError(error, "승인하지 못했습니다.") });
    }
    setApproving(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <OpsFilterBar
        label="변경 신청 조회"
        onApply={() => {
          setStatus(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft("");
          setStatus("");
          paging.resetPage();
        }}
      >
        <SelectField
          label="처리 상태"
          value={draft}
          options={STATUS_OPTIONS}
          onValueChange={setDraft}
        />
      </OpsFilterBar>
      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={
            message.tone === "error" ? "text-caption text-danger" : "text-caption text-ink"
          }
        >
          {message.text}
        </p>
      ) : null}
      <OpsTable
        caption="사무소 정보 변경 신청 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.requestId)}
        emptyMessage="심사할 변경 신청이 없습니다."
        columns={[
          { key: "id", header: "신청 번호", render: (row) => row.requestId },
          { key: "office", header: "사무소 번호", render: (row) => row.officeId },
          {
            key: "type",
            header: "변경 종류",
            render: (row) => CHANGE_TYPE_LABELS[row.changeType] ?? row.changeType,
          },
          {
            key: "values",
            header: "신청 값",
            render: (row) => <RequestedValues values={row.requestedValues} />,
          },
          {
            key: "status",
            header: "상태",
            render: (row) => (
              <span className="flex flex-col gap-1">
                <OpsStatusBadge status={row.status} map={CHANGE_STATUS} />
                {row.rejectionReason ? (
                  <span className="text-caption text-ink-2">사유: {row.rejectionReason}</span>
                ) : null}
              </span>
            ),
          },
          {
            key: "createdAt",
            header: "신청 시각",
            render: (row) => formatSeoulDateTime(row.createdAt),
          },
          {
            key: "actions",
            header: "처리",
            render: (row) =>
              row.status === "PENDING_REVIEW" ? (
                <span className="flex gap-2">
                  <Button
                    size="sm"
                    aria-label={`변경 신청 ${row.requestId} 승인`}
                    onClick={() => setApproving(row)}
                  >
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`변경 신청 ${row.requestId} 반려`}
                    onClick={() => setRejecting(row)}
                  >
                    반려
                  </Button>
                </span>
              ) : (
                "-"
              ),
          },
        ]}
      />
      <ConfirmDialog
        isOpen={approving !== null}
        title="변경 신청 승인"
        message="신청 값을 사무소 정보에 반영합니다. 승인 기록은 감사 로그에 남습니다."
        confirmLabel="승인"
        isPending={actions.approve.isPending}
        onConfirm={() => void approve()}
        onCancel={() => setApproving(null)}
      />
      <OpsReasonDialog
        isOpen={rejecting !== null}
        title="변경 신청 반려"
        description="반려 사유는 신청한 사무소에 공개됩니다."
        reasonLabel="반려 사유(고객 공개)"
        confirmLabel="반려"
        onSubmit={async (reason) => {
          if (!rejecting) return;
          await actions.reject.mutateAsync({ requestId: rejecting.requestId, reason });
          setMessage({ tone: "ok", text: "변경 신청을 반려했습니다." });
        }}
        onClose={() => setRejecting(null)}
      />
    </div>
  );
}
