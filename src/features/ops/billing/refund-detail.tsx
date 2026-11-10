"use client";

import Link from "next/link";
import { useState } from "react";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog, Modal } from "@/shared/components/ui/modal";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { useOpsSession } from "../model/ops-session";
import type { OpsRefundDetailResponse } from "@/lib/api/contracts/ops.schema";
import { useRefundActions, useRefundDetail } from "./billing-api";
import { BillingNav } from "./billing-nav";
import {
  BILLING_PRIVACY_NOTICE,
  REFUND_REASON_LABELS,
  REFUND_REVIEWABLE,
  REFUND_STATUS,
  STEP_UP_NOTICE,
  describeBillingError,
} from "./billing-model";

type Notice = { tone: "ok" | "error"; text: string };
type Dialog = "approve" | "reject" | "execute" | null;

const EXECUTE_RESULT_TEXT: Record<string, string> = {
  COMPLETED: "환불을 완료했습니다.",
  VERIFYING: "PG 결과를 확인하는 중입니다. 대사 화면에서 확정 여부를 확인해 주세요.",
  FAILED: "환불이 실패했습니다.",
};

function ApproveDialog({
  isOpen,
  needsEventId,
  onSubmit,
  onClose,
}: {
  isOpen: boolean;
  needsEventId: boolean;
  onSubmit: (input: { note: string; reasonEventId: string }) => Promise<unknown>;
  onClose: () => void;
}) {
  const [eventId, setEventId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const blocked = needsEventId && eventId.trim() === "";

  async function submit() {
    if (blocked) return;
    setIsPending(true);
    setError(null);
    try {
      await onSubmit({ note: note.trim(), reasonEventId: eventId.trim() });
      setEventId("");
      setNote("");
      onClose();
    } catch (caught) {
      setError(describeBillingError(caught, "승인하지 못했습니다."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title="환불 검토 승인"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="submit"
            disabled={blocked}
            isLoading={isPending}
            onClick={() => void submit()}
          >
            승인
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">
          승인하면 환불 금액이 예약되고 실행 단계로 넘어갑니다. 승인 기록은 감사 로그에 남습니다.
        </p>
        {needsEventId ? (
          <TextField
            label="환불 사유 사건 ID"
            value={eventId}
            onValueChange={setEventId}
            maxLength={100}
            required
            hint="대표가 사건 ID 없이 접수한 환불입니다. 확인한 사건 ID를 입력해야 승인할 수 있습니다."
          />
        ) : null}
        <TextAreaField label="검토 메모(선택)" value={note} onValueChange={setNote} rows={3} />
        {error ? (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function RecordCard({ detail }: { detail: OpsRefundDetailResponse }) {
  return (
    <Card title="환불 사건">
      <OpsDetailList
        items={[
          { label: "상태", value: <OpsStatusBadge status={detail.status} map={REFUND_STATUS} /> },
          {
            label: "사유",
            value: REFUND_REASON_LABELS[detail.reasonCode] ?? detail.reasonCode,
          },
          {
            label: "사무소",
            value: (
              <Link href={`/ops/offices/${detail.officeId}`} className="text-primary underline">
                {detail.officeId}
              </Link>
            ),
          },
          {
            label: "청구서",
            value: (
              <Link
                href={`/ops/billing/invoices/${detail.invoiceId}`}
                className="text-primary underline"
              >
                {detail.invoiceId}
              </Link>
            ),
          },
          { label: "사건 종류", value: detail.reasonEventType },
          { label: "사건 ID", value: detail.reasonEventId },
          { label: "신청 일시", value: formatSeoulDateTime(detail.requestedAt) },
          { label: "사건별 환불 권리액", value: formatKrw(detail.entitlementAmount) },
          { label: "기환불 누계", value: formatKrw(detail.previousRefundAmount) },
          { label: "처리 중 예약액", value: formatKrw(detail.reservedAmount) },
          { label: "환불 금액", value: formatKrw(detail.refundAmount) },
          { label: "검토한 운영자", value: detail.reviewedByOperatorName },
          {
            label: "검토 일시",
            value: detail.reviewedAt ? formatSeoulDateTime(detail.reviewedAt) : null,
          },
          { label: "거절 사유", value: detail.rejectionReason },
          { label: "PG 환불 참조 번호", value: detail.pgRefundId },
          {
            label: "PG 결과 확정 일시",
            value: detail.resolvedAt ? formatSeoulDateTime(detail.resolvedAt) : null,
          },
        ]}
      />
    </Card>
  );
}

function RefundBody({ detail }: { detail: OpsRefundDetailResponse }) {
  const session = useOpsSession();
  const actions = useRefundActions(detail.refundId);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const isPolicy = detail.reasonCode === "POLICY_COMPENSATION";
  const isSelfExecution = isPolicy && detail.reviewedByOperatorId === session.operatorId;
  const isReviewable = REFUND_REVIEWABLE.includes(detail.status);

  async function execute() {
    setNotice(null);
    try {
      const result = await actions.execute.mutateAsync();
      const text = EXECUTE_RESULT_TEXT[result.status] ?? "실행 결과를 확인해 주세요.";
      setNotice({
        tone: result.status === "FAILED" ? "error" : "ok",
        text: result.failureReason ? `${text} 사유: ${result.failureReason}` : text,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: describeBillingError(error, "환불을 실행하지 못했습니다."),
      });
    }
    setDialog(null);
  }

  return (
    <>
      <RecordCard detail={detail} />
      <Card title="처리">
        <div className="flex flex-col gap-3">
          {notice ? (
            <p
              role={notice.tone === "error" ? "alert" : "status"}
              className={
                notice.tone === "error" ? "text-caption text-danger" : "text-caption text-ink"
              }
            >
              {notice.text}
            </p>
          ) : null}
          {isReviewable ? (
            <>
              {detail.reasonEventId === null ? (
                <p role="note" className="text-caption text-ink-2">
                  사건 ID가 비어 있습니다. 승인할 때 확인한 사건 ID를 채워 주세요.
                </p>
              ) : null}
              {isPolicy ? (
                <p role="note" className="text-caption text-ink-2">
                  정책 외 보상은 검토 승인과 실행을 서로 다른 운영자가 맡습니다. 승인한 운영자는 이
                  건을 실행할 수 없습니다.
                </p>
              ) : null}
              <div className="flex gap-3">
                <Button onClick={() => setDialog("approve")}>승인</Button>
                <Button variant="ghost" onClick={() => setDialog("reject")}>
                  거절
                </Button>
              </div>
            </>
          ) : null}
          {detail.status === "APPROVED" ? (
            <>
              {isSelfExecution ? (
                <p role="note" className="text-caption text-danger">
                  정책 외 보상은 검토 승인한 운영자가 직접 실행할 수 없습니다. 다른 결제담당이
                  실행해 주세요.
                </p>
              ) : null}
              <div>
                <Button disabled={isSelfExecution} onClick={() => setDialog("execute")}>
                  환불 실행
                </Button>
              </div>
              <p className="text-caption text-ink-2">{STEP_UP_NOTICE}</p>
            </>
          ) : null}
          {!isReviewable && detail.status !== "APPROVED" ? (
            <p className="text-body text-ink-2">
              {detail.status === "VERIFYING"
                ? "PG 결과를 확인하는 중입니다. 대사 화면에서 확정 여부를 확인해 주세요."
                : "더 처리할 수 있는 작업이 없습니다."}
            </p>
          ) : null}
        </div>
      </Card>
      <ApproveDialog
        key={`approve-${dialog === "approve"}`}
        isOpen={dialog === "approve"}
        needsEventId={detail.reasonEventId === null}
        onSubmit={async (input) => {
          await actions.review.mutateAsync({
            decision: "APPROVE",
            note: input.note === "" ? null : input.note,
            reasonEventId: input.reasonEventId === "" ? null : input.reasonEventId,
          });
          setNotice({ tone: "ok", text: "환불 검토를 승인했습니다." });
        }}
        onClose={() => setDialog(null)}
      />
      <OpsReasonDialog
        isOpen={dialog === "reject"}
        title="환불 검토 거절"
        reasonLabel="거절 사유"
        description="거절하면 환불이 진행되지 않습니다. 거절 사유는 감사 로그에 남습니다."
        confirmLabel="거절"
        onSubmit={async (reason) => {
          await actions.review.mutateAsync({ decision: "REJECT", note: reason });
          setNotice({ tone: "ok", text: "환불 검토를 거절했습니다." });
        }}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        isOpen={dialog === "execute"}
        title="환불 실행"
        message={`${formatKrw(detail.refundAmount)}을 PG로 취소 요청합니다. ${STEP_UP_NOTICE}`}
        confirmLabel="환불 실행"
        isPending={actions.execute.isPending}
        onConfirm={() => void execute()}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}

export function RefundDetailScreen({ refundId }: { refundId: number }) {
  const query = useRefundDetail(refundId);
  return (
    <OpsScreen
      title={`환불 ${refundId}`}
      description="권리액 산정과 검토 이력을 확인하고 승인과 실행을 처리합니다."
      roles={["BILLING"]}
    >
      <BillingNav current="refunds" />
      <p className="text-caption text-ink-2">{BILLING_PRIVACY_NOTICE}</p>
      <QueryGate query={query} loadingLabel="환불 사건을 불러오는 중입니다">
        {(detail) => <RefundBody detail={detail} />}
      </QueryGate>
    </OpsScreen>
  );
}
