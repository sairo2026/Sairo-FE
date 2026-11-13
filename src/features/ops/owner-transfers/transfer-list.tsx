"use client";

import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { describeOpsError } from "../model/ops-errors";
import { useApproveOwnerTransfer, useOwnerTransferList } from "./transfer-api";
import { TRANSFER_ERRORS, TRANSFER_STATUS } from "./transfer-model";

const STATUS_OPTIONS = Object.entries(TRANSFER_STATUS).map(([value, entry]) => ({
  value,
  label: entry.label,
}));

type Filters = { status: string; officeId: string };
const INITIAL: Filters = { status: "UNDER_REVIEW", officeId: "" };

export function OwnerTransferListScreen() {
  const [draft, setDraft] = useState<Filters>(INITIAL);
  const [applied, setApplied] = useState<Filters>(INITIAL);
  const [target, setTarget] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const paging = useOpsPaging();
  const query = useOwnerTransferList({ ...applied, page: paging.page, size: paging.size });
  const approve = useApproveOwnerTransfer();

  async function confirm() {
    if (target === null) return;
    const transferId = target;
    try {
      await approve.mutateAsync(transferId);
      setNotice({ tone: "ok", text: `대표 이전 ${transferId}번을 승인했습니다.` });
    } catch (error) {
      const known = error instanceof ApiError ? TRANSFER_ERRORS[error.code] : undefined;
      setNotice({
        tone: "error",
        text: known ?? describeOpsError(error, "승인하지 못했습니다."),
      });
    } finally {
      setTarget(null);
    }
  }

  return (
    <OpsScreen
      title="대표 이전"
      description="후보가 수락해 운영자 승인을 기다리는 대표 이전을 확인하고 최종 승인합니다."
      roles={["REVIEW"]}
    >
      <OpsFilterBar
        label="대표 이전 조회"
        onApply={() => {
          setApplied(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft(INITIAL);
          setApplied(INITIAL);
          paging.resetPage();
        }}
      >
        <SelectField
          label="이전 상태"
          value={draft.status}
          options={STATUS_OPTIONS}
          onValueChange={(status) => setDraft((current) => ({ ...current, status }))}
        />
        <TextField
          label="사무소 번호"
          kind="number"
          value={draft.officeId}
          onValueChange={(officeId) => setDraft((current) => ({ ...current, officeId }))}
        />
      </OpsFilterBar>
      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={notice.tone === "error" ? "text-caption text-danger" : "text-caption text-ink"}
        >
          {notice.text}
        </p>
      ) : null}
      <OpsTable
        caption="대표 이전 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.transferId)}
        emptyMessage="조건에 맞는 대표 이전이 없습니다."
        columns={[
          { key: "id", header: "이전 번호", render: (row) => row.transferId },
          {
            key: "office",
            header: "사무소",
            render: (row) => `${row.officeName} (${row.officeId})`,
          },
          { key: "from", header: "현재 대표", render: (row) => row.fromDisplayName },
          { key: "to", header: "후보", render: (row) => row.toDisplayName },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={TRANSFER_STATUS} />,
          },
          {
            key: "requestedAt",
            header: "요청 시각",
            render: (row) => formatSeoulDateTime(row.requestedAt),
          },
          {
            key: "acceptedAt",
            header: "수락 시각",
            render: (row) => (row.acceptedAt ? formatSeoulDateTime(row.acceptedAt) : "-"),
          },
          {
            key: "completedAt",
            header: "완료 시각",
            render: (row) => (row.completedAt ? formatSeoulDateTime(row.completedAt) : "-"),
          },
          {
            key: "action",
            header: "처리",
            render: (row) =>
              row.status === "UNDER_REVIEW" ? (
                <Button size="sm" onClick={() => setTarget(row.transferId)}>
                  최종 승인
                </Button>
              ) : (
                "-"
              ),
          },
        ]}
      />
      <ConfirmDialog
        isOpen={target !== null}
        title="대표 이전 최종 승인"
        message="승인하면 현재 대표는 중개사로, 후보는 대표로 바뀝니다. 승인 직전에 소속과 자격, 등록관계, 사무소 종료 여부를 다시 확인합니다."
        confirmLabel="승인"
        isPending={approve.isPending}
        onConfirm={() => void confirm()}
        onCancel={() => setTarget(null)}
      />
    </OpsScreen>
  );
}
