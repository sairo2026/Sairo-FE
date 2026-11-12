"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { DetailList, MutedNote, TextLink } from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Modal } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { createRefundRequest } from "../api/billing.api";
import type { InvoiceDetail } from "../api/wire";
import { billingKeys, useInvoice } from "../hooks/billing-queries";
import {
  ATTEMPT_RESULT,
  FAILURE_CATEGORY,
  REFUND_REASONS,
  TAX_DOCUMENT_STATUS,
  isMissing,
} from "../model/labels";
import { TAX_COPY } from "../model/legal-copy";
import { COPY, describeBillingError } from "../model/messages";
import { InvoiceStatusBadge } from "./invoices-screen";

function maskEmailNote(value: string | null | undefined) {
  return value ?? "-";
}

function RefundDialog({ invoice, onClose }: { invoice: InvoiceDetail; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => createRefundRequest({ invoiceId: invoice.invoiceId, reasonCode: reason }),
    onSuccess: async (result) => {
      setError(undefined);
      setNotice(result.status === "RECEIVED" ? COPY.refundReceived : COPY.refundExisting);
      await queryClient.invalidateQueries({ queryKey: billingKeys.all });
      return result;
    },
    onError: (caught) => {
      setNotice(undefined);
      setError(
        describeBillingError(
          caught,
          "환불 신청을 접수하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.",
        ),
      );
    },
  });

  return (
    <Modal
      isOpen
      title="환불 신청"
      onClose={onClose}
      footer={
        notice ? (
          <Button onClick={onClose}>닫기</Button>
        ) : (
          <>
            <Button variant="cancel" onClick={onClose}>
              취소
            </Button>
            <Button
              isLoading={mutation.isPending}
              onClick={() => {
                if (!reason) {
                  setFieldError("환불 사유를 선택해 주세요.");
                  return;
                }
                setFieldError(undefined);
                mutation.mutate();
              }}
            >
              환불 신청
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <p>{COPY.refundTop}</p>
        <MutedNote>{COPY.refundFree}</MutedNote>
        <SelectField
          label="환불 사유"
          value={reason}
          placeholder="선택해 주세요"
          options={REFUND_REASONS.map((item) => ({ value: item.value, label: item.label }))}
          onValueChange={(next) => {
            setReason(next);
            setFieldError(undefined);
          }}
          error={fieldError}
        />
        {notice ? <FormNotice>{notice}</FormNotice> : null}
        {error ? <FormAlert>{error}</FormAlert> : null}
      </div>
    </Modal>
  );
}

function InvoiceView({ invoice }: { invoice: InvoiceDetail }) {
  const [refunding, setRefunding] = useState(false);
  const canRefund = invoice.refundableAmount > 0;
  return (
    <div className="flex flex-col gap-6">
      <Card title="청구서">
        <DetailList
          items={[
            {
              label: "청구기간",
              value: `${formatSeoulDate(invoice.periodStart)} ~ ${formatSeoulDate(invoice.periodEnd)}`,
            },
            { label: "상태", value: <InvoiceStatusBadge status={invoice.status} /> },
            { label: "이용 인원", value: `${invoice.memberCount}명` },
            { label: "금액", value: `${formatKrw(invoice.amount)} (VAT 포함)` },
            {
              label: "공급가액",
              value: isMissing(invoice.supplyAmount) ? "-" : formatKrw(invoice.supplyAmount),
            },
            {
              label: "세액",
              value: isMissing(invoice.vatAmount) ? "-" : formatKrw(invoice.vatAmount),
            },
            { label: "동의 한도", value: formatKrw(invoice.consentAmountLimit) },
            { label: "환불된 금액", value: formatKrw(invoice.refundedAmount) },
            { label: "환불 가능 금액", value: formatKrw(invoice.refundableAmount) },
            ...(invoice.nextRetryAt
              ? [{ label: "다음 자동 재시도", value: formatSeoulDateTime(invoice.nextRetryAt) }]
              : []),
          ]}
        />
        {invoice.status === "VERIFYING" ? (
          <MutedNote>결제 결과를 결제사에 확인하고 있습니다. 확인이 끝나면 알려드립니다.</MutedNote>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button disabled={!canRefund} onClick={() => setRefunding(true)}>
            환불 신청
          </Button>
          <Link
            href={`/billing/refunds?invoiceId=${invoice.invoiceId}`}
            className="text-caption font-semibold text-primary hover:underline"
          >
            이 청구서의 환불 내역
          </Link>
        </div>
      </Card>
      <Card title="결제 시도">
        {invoice.attempts.length === 0 ? (
          <p className="text-body text-ink-2">결제 시도 내역이 없습니다.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {invoice.attempts.map((attempt) => (
              <li key={attempt.pgOrderId} className="flex flex-col gap-1 py-3 text-body">
                <span className="font-semibold">
                  주문 {attempt.pgOrderId} · {ATTEMPT_RESULT[attempt.result] ?? attempt.result}
                </span>
                <span className="text-caption text-ink-2">
                  {formatSeoulDateTime(attempt.attemptedAt)}
                  {attempt.failureCategory
                    ? ` · ${FAILURE_CATEGORY[attempt.failureCategory] ?? "기타"}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="증빙 발급 상태">
        {invoice.taxDocuments.length === 0 ? (
          <div className="flex flex-col gap-2 text-body text-ink-2">
            <p>{TAX_COPY.states.unavailable}</p>
            <p>{TAX_COPY.receipt}</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {invoice.taxDocuments.map((doc, index) => (
              <li key={`${doc.documentKind}-${index}`} className="py-3 text-body">
                {doc.status === "PENDING"
                  ? TAX_COPY.states.pending
                  : doc.status === "ISSUED" && doc.issuedOn
                    ? TAX_COPY.states.issued(
                        formatSeoulDate(doc.issuedOn),
                        maskEmailNote(doc.maskedReceiverEmail),
                      )
                    : `${TAX_DOCUMENT_STATUS[doc.status] ?? doc.status} · 수신 ${maskEmailNote(doc.maskedReceiverEmail)}`}
              </li>
            ))}
          </ul>
        )}
        {invoice.supplier?.businessName ? (
          <p className="mt-3 text-caption text-ink-2">
            {isMissing(invoice.vatAmount) || isMissing(invoice.supplyAmount)
              ? ""
              : `${TAX_COPY.invoiceLine(formatKrw(invoice.amount), formatKrw(invoice.vatAmount), formatKrw(invoice.supplyAmount))} `}
            공급자 {invoice.supplier.businessName}
            {invoice.supplier.representativeName
              ? ` 대표 ${invoice.supplier.representativeName}`
              : ""}
            {invoice.supplier.businessNumber
              ? ` 사업자등록번호 ${invoice.supplier.businessNumber}`
              : ""}
          </p>
        ) : null}
        <div className="mt-3">
          <TextLink href="/billing/tax-recipient">세금계산서 수신 정보 입력</TextLink>
        </div>
      </Card>
      {refunding ? <RefundDialog invoice={invoice} onClose={() => setRefunding(false)} /> : null}
    </div>
  );
}

export function InvoiceDetailScreen({ invoiceId }: { invoiceId: number }) {
  const query = useInvoice(invoiceId);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="결제 내역 상세"
        actions={<TextLink href="/billing/invoices">목록으로</TextLink>}
      />
      <QueryGate query={query} loadingLabel="청구서를 불러오는 중입니다.">
        {(invoice) => <InvoiceView invoice={invoice} />}
      </QueryGate>
    </div>
  );
}
