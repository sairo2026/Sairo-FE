"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import {
  DetailList,
  ReasonDialog,
  StatusBadge,
  TextLink,
} from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { DataMigrationSupportNotice } from "@/shared/legal/data-rights-notices";
import { cn } from "@/shared/lib/cn";
import { formatCount, formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import {
  acceptImportSupportQuote,
  approveImportSupport,
  cancelImportSupport,
  requestImportSupportChanges,
} from "../api/support-request.api";
import type { ImportSupportDetail } from "../api/wire";
import { migrationKeys } from "../hooks/migration-queries";
import { supportRequestKeys, useImportSupportRequest } from "../hooks/support-queries";
import { PaymentUnavailableError, tossPaymentLauncher } from "../lib/payment-launcher";
import type { PaymentLauncher } from "../lib/payment-launcher";
import { SUPPORT_STATUS, SUPPORT_STEPS } from "../model/labels";
import { describeMigrationError } from "../model/messages";
import { SUPPORT_REQUEST_COPY as COPY } from "../model/support-copy";

const PAYMENT_STORAGE_PREFIX = "import-support-payment-";
const CANCELLABLE = ["REQUESTED", "QUOTED", "ACCEPTED"];

type PaymentInfo = { orderId: string; amount: number };

function readPaymentInfo(requestId: number): PaymentInfo | null {
  try {
    const raw = window.sessionStorage.getItem(`${PAYMENT_STORAGE_PREFIX}${requestId}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "orderId" in parsed &&
      "amount" in parsed &&
      typeof parsed.orderId === "string" &&
      typeof parsed.amount === "number"
    ) {
      return { orderId: parsed.orderId, amount: parsed.amount };
    }
  } catch {
    return null;
  }
  return null;
}

function storePaymentInfo(requestId: number, info: PaymentInfo) {
  try {
    window.sessionStorage.setItem(`${PAYMENT_STORAGE_PREFIX}${requestId}`, JSON.stringify(info));
  } catch {
    return;
  }
}

function stepIndex(status: string): number {
  if (status === "PAID") return SUPPORT_STEPS.findIndex((step) => step.status === "ACCEPTED");
  return SUPPORT_STEPS.findIndex((step) => step.status === status);
}

function Stepper({ status }: { status: string }) {
  const current = stepIndex(status);
  return (
    <ol aria-label="진행 단계" className="flex flex-wrap gap-2">
      {SUPPORT_STEPS.map((step, index) => {
        const isCurrent = index === current;
        const isDone = current > index;
        return (
          <li
            key={step.status}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "rounded-control border px-3 py-1 text-caption",
              isCurrent
                ? "border-primary bg-primary-soft font-bold text-primary"
                : isDone
                  ? "border-line bg-surface text-ink"
                  : "border-line text-ink-3",
            )}
          >
            {index + 1}. {step.label}
            {isDone ? " (완료)" : ""}
          </li>
        );
      })}
    </ol>
  );
}

type Props = { detail: ImportSupportDetail; launcher: PaymentLauncher };

function Actions({ detail, launcher }: Props) {
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const [dialog, setDialog] = useState<"cancel" | "approve" | "change" | null>(null);
  const [error, setError] = useState<string>();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: supportRequestKeys.all });
    await queryClient.invalidateQueries({ queryKey: migrationKeys.batches });
  }

  function failure(fallback: string) {
    return (caught: unknown) => {
      setDialog(null);
      setError(describeMigrationError(caught, fallback));
    };
  }

  const payMutation = useMutation({
    mutationFn: async () => {
      let info = readPaymentInfo(detail.requestId);
      if (info === null) {
        const accepted = await acceptImportSupportQuote(detail.requestId);
        info = { orderId: accepted.paymentOrderId, amount: accepted.paymentAmount };
      }
      storePaymentInfo(detail.requestId, info);
      if (!launcher.isConfigured()) throw new PaymentUnavailableError();
      const base = `${window.location.origin}/import/support/${detail.requestId}/payment-result`;
      await launcher.requestPayment({
        customerKey: "ANONYMOUS",
        orderId: info.orderId,
        orderName: "데이터 이전 지원",
        amount: info.amount,
        successUrl: base,
        failUrl: `${base}?code=PAYMENT_CANCELED`,
      });
    },
    onSuccess: refresh,
    onError: (caught) => {
      if (caught instanceof PaymentUnavailableError) {
        setError(launcher.isConfigured() ? COPY.paymentOpenFailed : COPY.paymentPreparing);
        void refresh();
        return;
      }
      failure("결제를 시작하지 못했습니다.")(caught);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: acceptImportSupportQuote,
    onSuccess: async (result) => {
      storePaymentInfo(detail.requestId, {
        orderId: result.paymentOrderId,
        amount: result.paymentAmount,
      });
      setError(undefined);
      await refresh();
    },
    onError: failure("견적을 수락하지 못했습니다."),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelImportSupport,
    onSuccess: async () => {
      setDialog(null);
      setError(undefined);
      await refresh();
    },
    onError: failure("신청을 취소하지 못했습니다."),
  });

  const approveMutation = useMutation({
    mutationFn: approveImportSupport,
    onSuccess: async () => {
      setDialog(null);
      setError(undefined);
      await refresh();
    },
    onError: failure("매핑을 승인하지 못했습니다."),
  });

  const changeMutation = useMutation({
    mutationFn: requestImportSupportChanges,
    onSuccess: async () => {
      setDialog(null);
      setError(undefined);
      await refresh();
    },
    onError: failure("수정을 요청하지 못했습니다."),
  });

  const { status } = detail;
  const canCancel = CANCELLABLE.includes(status);
  const changeUsed = detail.changeRequestCount >= 1;
  const mapping = detail.submittedMapping;

  return (
    <div className="flex flex-col gap-5">
      {status === "REQUESTED" ? <FormNotice>{COPY.requestedWait}</FormNotice> : null}
      {status === "QUOTED" ? (
        <section aria-label={COPY.quoteTitle} className="flex flex-col gap-2">
          <p className="text-h2 font-bold text-ink">{formatKrw(detail.quoteAmount)}</p>
          <p className="text-caption text-ink-2">{COPY.quoteVat}</p>
          <p className="text-caption text-ink-2">{COPY.quoteStandard}</p>
          {detail.scopeNote ? (
            <p className="text-caption text-ink">범위 비고: {detail.scopeNote}</p>
          ) : null}
          <div>
            <Button
              disabled={isReadOnly}
              isLoading={acceptMutation.isPending}
              onClick={() => acceptMutation.mutate(detail.requestId)}
            >
              {COPY.acceptQuote}
            </Button>
          </div>
        </section>
      ) : null}
      {status === "ACCEPTED" ? (
        <section className="flex flex-col gap-2">
          <FormNotice>{COPY.acceptedWait}</FormNotice>
          <p className="text-h2 font-bold text-ink">{formatKrw(detail.quoteAmount)}</p>
          <div>
            <Button
              disabled={isReadOnly}
              isLoading={payMutation.isPending}
              onClick={() => payMutation.mutate()}
            >
              {COPY.payNow}
            </Button>
          </div>
        </section>
      ) : null}
      {status === "PAID" ? <FormNotice>{COPY.paidWait}</FormNotice> : null}
      {status === "PROCESSING" ? (
        <div className="flex flex-col gap-2">
          <p className="text-body text-ink">{COPY.processing(detail.assignedOperatorName)}</p>
          {detail.changeRequestCount > 0 && detail.changeRequestReason ? (
            <p className="text-caption text-ink-2">
              {COPY.changeInProgress(detail.changeRequestReason)}
            </p>
          ) : null}
        </div>
      ) : null}
      {status === "REVIEW" ? (
        <section aria-label={COPY.reviewTitle} className="flex flex-col gap-4">
          <p className="text-caption text-ink-2">{COPY.reviewIntro}</p>
          {mapping ? (
            <div className="overflow-x-auto rounded-control border border-line">
              <table className="w-full min-w-[28rem] border-collapse text-left text-caption">
                <caption className="sr-only">제출된 열 대응 (버전 {mapping.versionNo})</caption>
                <thead className="bg-surface">
                  <tr>
                    {["원본 열", "사이로 항목", "제안 신뢰도"].map((column) => (
                      <th key={column} scope="col" className="px-3 py-2 font-semibold text-ink">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapping.items.map((item) => (
                    <tr key={item.sourceColumn} className="border-t border-line">
                      <td className="px-3 py-2 text-ink">{item.sourceColumn}</td>
                      <td className="px-3 py-2 text-ink-2">{item.targetField}</td>
                      <td className="px-3 py-2 text-ink-2">
                        {item.confidence === null || item.confidence === undefined
                          ? "-"
                          : `${Math.round(item.confidence * 100)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {detail.previewSummary ? (
            <DetailList
              items={[
                { label: "행 수", value: `${detail.previewSummary.rowCount}건` },
                { label: "경고", value: `${detail.previewSummary.warningCount}건` },
                { label: "중복", value: `${detail.previewSummary.duplicateCount}건` },
                { label: "연결 후보", value: `${detail.previewSummary.relationMatchCount}건` },
              ]}
            />
          ) : null}
          <TextLink href={`/import/${detail.importBatchId}`}>{COPY.rowPreviewLink}</TextLink>
          {changeUsed ? <p className="text-caption text-ink-2">{COPY.changeLimit}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button disabled={isReadOnly} onClick={() => setDialog("approve")}>
              {COPY.approve}
            </Button>
            <Button
              variant="outlined"
              disabled={isReadOnly || changeUsed}
              onClick={() => setDialog("change")}
            >
              {COPY.requestChanges}
            </Button>
          </div>
        </section>
      ) : null}
      {status === "APPROVED" ? (
        <FormNotice>{COPY.approvedNotice(detail.approvedMappingVersionNo)}</FormNotice>
      ) : null}
      {status === "DELIVERED" ? <FormNotice>{COPY.deliveredNotice}</FormNotice> : null}
      {status === "CANCELLED" ? (
        <FormNotice>
          {COPY.cancelledNotice}
          {detail.cancelReason ? ` 사유: ${detail.cancelReason}` : ""}
        </FormNotice>
      ) : null}
      {status === "REJECTED" ? (
        <FormNotice>{COPY.rejectedNotice(detail.rejectReason)}</FormNotice>
      ) : null}
      {detail.executionResult && (status === "APPROVED" || status === "DELIVERED") ? (
        <DetailList
          items={[
            { label: "성공", value: `${detail.executionResult.succeeded}건` },
            { label: "실패", value: `${detail.executionResult.failed}건` },
            { label: "미처리", value: `${detail.executionResult.unprocessed}건` },
          ]}
        />
      ) : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      {canCancel ? (
        <div>
          <Button variant="ghost" disabled={isReadOnly} onClick={() => setDialog("cancel")}>
            {COPY.cancelButton}
          </Button>
        </div>
      ) : (
        ["PAID", "PROCESSING", "REVIEW"].includes(status) && (
          <p className="text-caption text-ink-2">{COPY.paidCannotCancel}</p>
        )
      )}
      <ReasonDialog
        isOpen={dialog === "cancel"}
        title="신청을 취소할까요?"
        description={COPY.cancelConfirm}
        label={COPY.cancelReason}
        confirmLabel={COPY.cancelButton}
        isPending={cancelMutation.isPending}
        validate={() => undefined}
        onConfirm={(reason) =>
          cancelMutation.mutate({
            requestId: detail.requestId,
            version: detail.version,
            reason: reason || undefined,
          })
        }
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        isOpen={dialog === "approve"}
        title="매핑을 승인할까요?"
        message={COPY.approveConfirm(mapping?.versionNo ?? 0)}
        confirmLabel={COPY.approve}
        isPending={approveMutation.isPending}
        onConfirm={() =>
          approveMutation.mutate({ requestId: detail.requestId, version: detail.version })
        }
        onCancel={() => setDialog(null)}
      />
      <ReasonDialog
        isOpen={dialog === "change"}
        title={COPY.requestChanges}
        label={COPY.changeReason}
        confirmLabel={COPY.requestChanges}
        isPending={changeMutation.isPending}
        validate={(value) => (value.trim() === "" ? COPY.changeReasonRequired : undefined)}
        onConfirm={(reason) =>
          changeMutation.mutate({ requestId: detail.requestId, version: detail.version, reason })
        }
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function Body({ detail, launcher }: Props) {
  const status = SUPPORT_STATUS[detail.status];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${detail.sourceSystem} 이전 지원`}
        description={`예상 레코드 ${formatCount(detail.estimatedRowCount)}건`}
        actions={
          <>
            <StatusBadge tone={status?.tone ?? "gray"} label={status?.label ?? detail.status} />
            <TextLink href="/import/support">신청 목록</TextLink>
          </>
        }
      />
      <Stepper status={detail.status} />
      <Card title="진행">
        <Actions detail={detail} launcher={launcher} />
      </Card>
      <Card title="신청 정보">
        <DetailList
          items={[
            { label: "신청 시각", value: formatSeoulDateTime(detail.requestedAt) },
            { label: "견적", value: detail.quoteAmount ? formatKrw(detail.quoteAmount) : "-" },
            { label: "담당", value: detail.assignedOperatorName ?? "배정 전" },
            {
              label: COPY.directWork,
              value: detail.directWorkAllowed ? COPY.directWorkAllowed : COPY.directWorkBlocked,
            },
            {
              label: "이전 파일",
              value: <TextLink href={`/import/${detail.importBatchId}`}>파일 보기</TextLink>,
            },
          ]}
        />
      </Card>
      <DataMigrationSupportNotice />
    </div>
  );
}

export function SupportRequestDetailScreen({
  requestId,
  launcher = tossPaymentLauncher,
}: {
  requestId: number;
  launcher?: PaymentLauncher;
}) {
  const { role } = useOfficeAccess();
  const query = useImportSupportRequest(requestId);
  if (role !== "OWNER") return <ErrorScreen kind="forbidden" />;
  return (
    <QueryGate query={query} loadingLabel="이전 지원 신청을 불러오는 중입니다.">
      {(detail) => <Body detail={detail} launcher={launcher} />}
    </QueryGate>
  );
}
