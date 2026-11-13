"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useReconciliationList, useResolveReconciliation } from "./billing-api";
import { BillingNav } from "./billing-nav";
import {
  BILLING_PRIVACY_NOTICE,
  RECONCILIATION_SOURCE_LABELS,
  RECONCILIATION_STATUS,
  describeBillingError,
  toOptionalNumber,
} from "./billing-model";
import { ReconciliationRunCard } from "./reconciliation-run-card";
import type { OpsBillingReconciliationListResponse } from "@/lib/api/contracts/ops.schema";

type Entry = OpsBillingReconciliationListResponse["items"][number];
type Filter = { businessDate: string; status: string; assigned: string; unresolved: boolean };

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(RECONCILIATION_STATUS).map(([value, entry]) => ({
    value,
    label: entry.label,
  })),
];

function yesterday(): string {
  return formatSeoulDate(new Date(Date.now() - 86_400_000));
}

function ResolveDialog({
  entry,
  onClose,
  onDone,
}: {
  entry: Entry;
  onClose: () => void;
  onDone: () => void;
}) {
  const resolve = useResolveReconciliation();
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [assignee, setAssignee] = useState("");
  const [errors, setErrors] = useState<{ reason?: string; evidence?: string; assignee?: string }>(
    {},
  );
  const [failure, setFailure] = useState<string | null>(null);

  async function submit() {
    const found: typeof errors = {};
    if (reason.trim() === "") found.reason = "차이 원인을 입력해 주세요.";
    if (evidence.trim() === "") found.evidence = "해결 근거를 입력해 주세요.";
    if (assignee !== "" && !toOptionalNumber(assignee)) {
      found.assignee = "담당 운영자 ID를 숫자로 입력해 주세요.";
    }
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;
    try {
      await resolve.mutateAsync({
        entryId: entry.entryId,
        body: {
          differenceReason: reason.trim(),
          resolutionEvidence: evidence.trim(),
          assigneeOperatorId: assignee === "" ? null : Number(assignee),
        },
      });
      onDone();
    } catch (error) {
      setFailure(describeBillingError(error, "해결 내용을 저장하지 못했습니다."));
    }
  }

  return (
    <Modal
      isOpen
      title={`대사 차이 해결 ${entry.entryId}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>
            취소
          </Button>
          <Button isLoading={resolve.isPending} onClick={() => void submit()}>
            해결 기록
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">
          내부 금액 {formatKrw(entry.internalAmount)}, PG 금액 {formatKrw(entry.pgAmount)}. 차이
          원인과 해결 근거는 감사 로그에 남습니다.
        </p>
        <TextAreaField
          label="차이 원인"
          value={reason}
          onValueChange={setReason}
          error={errors.reason}
          rows={3}
          maxLength={500}
        />
        <TextAreaField
          label="해결 근거"
          value={evidence}
          onValueChange={setEvidence}
          error={errors.evidence}
          rows={3}
          maxLength={500}
          hint="PG 조회 기록이나 정산 자료 등 확인한 근거를 적어 주세요."
        />
        <TextField
          label="담당 운영자 ID"
          kind="number"
          value={assignee}
          onValueChange={setAssignee}
          error={errors.assignee}
          hint="비우면 나를 담당으로 기록합니다. 활성 결제담당만 지정할 수 있습니다."
        />
        {failure ? (
          <p role="alert" className="text-caption text-danger">
            {failure}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

export function ReconciliationScreen() {
  const empty: Filter = { businessDate: yesterday(), status: "", assigned: "", unresolved: false };
  const [draft, setDraft] = useState<Filter>(empty);
  const [applied, setApplied] = useState<Filter>(empty);
  const [target, setTarget] = useState<Entry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const paging = useOpsPaging();
  const query = useReconciliationList({
    businessDate: applied.businessDate,
    status: applied.status,
    assignedOperatorId: applied.assigned,
    unresolved: applied.unresolved ? true : undefined,
    page: paging.page,
    size: paging.size,
  });
  const counts = Object.keys(RECONCILIATION_STATUS).map((status) => ({
    status,
    count: query.data?.items.filter((item) => item.status === status).length ?? 0,
  }));

  return (
    <OpsScreen
      title="PG 대사"
      description="전일 승인·취소 거래를 PG 자료와 대조하고 차이의 원인과 해결 근거를 기록합니다."
      roles={["BILLING"]}
    >
      <BillingNav current="reconciliation" />
      <p className="text-caption text-ink-2">{BILLING_PRIVACY_NOTICE}</p>
      <OpsFilterBar
        label="대사 결과 조회"
        onApply={() => {
          setApplied(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft(empty);
          setApplied(empty);
          paging.resetPage();
        }}
      >
        <DateTimeField
          label="영업일"
          kind="date"
          value={draft.businessDate}
          onValueChange={(businessDate) => setDraft({ ...draft, businessDate })}
        />
        <SelectField
          label="대사 결과"
          value={draft.status}
          options={STATUS_OPTIONS}
          onValueChange={(status) => setDraft({ ...draft, status })}
        />
        <TextField
          label="담당 운영자 ID"
          kind="number"
          value={draft.assigned}
          onValueChange={(assigned) => setDraft({ ...draft, assigned })}
        />
        <Checkbox
          label="미해결 차이만"
          checked={draft.unresolved}
          onCheckedChange={(unresolved) => setDraft({ ...draft, unresolved })}
        />
      </OpsFilterBar>
      <ReconciliationRunCard
        businessDate={applied.businessDate}
        onRerunDone={() => void query.refetch()}
      />
      <ul aria-label="대사 결과 건수" className="flex flex-wrap gap-4 text-caption text-ink-2">
        {counts.map((item) => (
          <li key={item.status}>
            {RECONCILIATION_STATUS[item.status]?.label} {item.count}건
          </li>
        ))}
      </ul>
      {notice ? (
        <p role="status" className="text-caption text-ink">
          {notice}
        </p>
      ) : null}
      <OpsTable
        caption="대사 결과 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.entryId)}
        emptyMessage="해당 영업일의 대사 결과가 없습니다."
        columns={[
          { key: "id", header: "항목", render: (row) => row.entryId },
          {
            key: "source",
            header: "출처",
            render: (row) => RECONCILIATION_SOURCE_LABELS[row.sourceType] ?? row.sourceType,
          },
          { key: "order", header: "PG 주문 ID", render: (row) => row.pgOrderId ?? "-" },
          { key: "invoice", header: "청구서", render: (row) => row.invoiceId ?? "-" },
          { key: "internal", header: "내부 금액", render: (row) => formatKrw(row.internalAmount) },
          { key: "pg", header: "PG 금액", render: (row) => formatKrw(row.pgAmount) },
          {
            key: "status",
            header: "결과",
            render: (row) => <OpsStatusBadge status={row.status} map={RECONCILIATION_STATUS} />,
          },
          { key: "reason", header: "차이 원인", render: (row) => row.differenceReason ?? "-" },
          { key: "evidence", header: "해결 근거", render: (row) => row.resolutionEvidence ?? "-" },
          {
            key: "assignee",
            header: "담당",
            render: (row) => row.assignedOperatorId ?? "-",
          },
          {
            key: "resolved",
            header: "해결 일시",
            render: (row) => (row.resolvedAt ? formatSeoulDateTime(row.resolvedAt) : "-"),
          },
          {
            key: "action",
            header: "처리",
            render: (row) =>
              row.status !== "MATCHED" && row.resolvedAt === null ? (
                <Button
                  size="sm"
                  variant="outlined"
                  aria-label={`항목 ${row.entryId} 해결 기록`}
                  onClick={() => setTarget(row)}
                >
                  해결 기록
                </Button>
              ) : (
                "-"
              ),
          },
        ]}
      />
      {target ? (
        <ResolveDialog
          entry={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setNotice(`대사 항목 ${target.entryId}의 해결 내용을 기록했습니다.`);
            setTarget(null);
          }}
        />
      ) : null}
    </OpsScreen>
  );
}
