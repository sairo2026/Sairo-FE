"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { PurchaseConsentPreviewResponse } from "@/lib/api/contracts/billing.schema";
import { ApiError } from "@/shared/api/client";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { DetailList, MutedNote, TextLink } from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Checkbox } from "@/shared/components/ui/select-field";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { submitPurchaseConsent } from "../api/billing.api";
import { billingKeys, useConsentPreview, useSubscription } from "../hooks/billing-queries";
import { PLAN_LABEL } from "../model/labels";
import { COPY, describeBillingError } from "../model/messages";

const REFETCH_CODES = ["CONSENT_TERMS_MISMATCH", "TERMS_VERSION_CHANGED"];

function ConsentForm({
  preview,
  onStale,
}: {
  preview: PurchaseConsentPreviewResponse;
  onStale: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const subscription = useSubscription();
  const [autoCharge, setAutoCharge] = useState(false);
  const [cancelRefund, setCancelRefund] = useState(false);
  const [checkError, setCheckError] = useState<string>();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      submitPurchaseConsent({
        termsVersion: preview.termsVersion,
        plan: preview.plan,
        memberCount: preview.memberCount,
        priceVersion: preview.priceVersion,
        priceChangeNoticeId: preview.priceChangeNoticeId,
        totalAmountInclVat: preview.totalAmountInclVat,
        amountLimit: preview.amountLimit,
        periodStart: preview.periodStart,
        periodEnd: preview.periodEnd,
        nextChargeAt: preview.nextChargeAt,
        agreed: true,
      }),
    onSuccess: async () => {
      setError(undefined);
      setDone(true);
      await queryClient.invalidateQueries({ queryKey: billingKeys.subscription });
    },
    onError: (caught) => {
      const message = describeBillingError(
        caught,
        "동의를 기록하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.",
      );
      if (caught instanceof ApiError && REFETCH_CODES.includes(caught.code)) {
        setAutoCharge(false);
        setCancelRefund(false);
        onStale(message);
        return;
      }
      setError(message);
    },
  });

  function submit() {
    setError(undefined);
    if (!autoCharge || !cancelRefund) {
      setCheckError(COPY.consentChecksMissing);
      return;
    }
    setCheckError(undefined);
    mutation.mutate();
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <FormNotice>
          구독 조건 확인이 기록됐습니다. {COPY.consentNoCharge}
          {preview.firstBillingScheduledAt
            ? ` 실제 청구는 첫 청구 예정 시각 ${formatSeoulDateTime(preview.firstBillingScheduledAt)}에 시작합니다.`
            : ""}
        </FormNotice>
        <TextLink href="/billing">구독 현황으로</TextLink>
      </div>
    );
  }

  const card = subscription.data?.paymentMethod;
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-ink">{COPY.consentTop}</p>
      <Card title="구독 조건 요약">
        <DetailList
          items={[
            {
              label: "상품",
              value: `사이로 월 구독 (${PLAN_LABEL[preview.plan] ?? preview.plan})`,
            },
            { label: "이용 인원", value: `${preview.memberCount}명` },
            {
              label: "월 금액",
              value: `${formatKrw(preview.totalAmountInclVat)} (VAT 포함, 부가세 ${formatKrw(preview.vatAmount)})`,
            },
            { label: "동의 한도", value: formatKrw(preview.amountLimit) },
            {
              label: "이용 기간",
              value: `${formatSeoulDate(preview.periodStart)} ~ ${formatSeoulDate(preview.periodEnd)}`,
            },
            {
              label: "첫 결제",
              value: preview.firstBillingScheduledAt
                ? formatSeoulDateTime(preview.firstBillingScheduledAt)
                : "결제 시작 전 별도 안내",
            },
            { label: "다음 결제", value: formatSeoulDate(preview.nextChargeAt) },
            { label: "가격 버전", value: preview.priceVersion },
            {
              label: "결제수단",
              value: card
                ? `${card.cardIssuer ?? "카드"} 끝자리 ${card.cardLast4 ?? "----"}`
                : "등록 전",
            },
            { label: "약관 버전", value: preview.termsVersion },
          ]}
        />
        {preview.priceChangeNoticeId ? (
          <MutedNote>
            가격 변경 안내에 대한 동의입니다. 새 가격 버전과 새 금액, 새 한도를 다시 확인해 주세요.
          </MutedNote>
        ) : null}
        <p className="mt-3 text-caption text-ink-2">{COPY.consentLimitNote}</p>
        <p className="mt-1 text-caption text-ink-2">{preview.cancellationTerms}</p>
        <p className="mt-1 text-caption text-ink-2">{preview.refundTerms}</p>
      </Card>
      <Card title="동의">
        <div className="flex flex-col gap-3">
          <Checkbox
            checked={autoCharge}
            onCheckedChange={setAutoCharge}
            label={COPY.consentAutoCharge}
          />
          <Checkbox
            checked={cancelRefund}
            onCheckedChange={setCancelRefund}
            label={COPY.consentCancelRefund}
          />
          <TextLink href="/legal/refund-policy">환불 조건 전문 보기</TextLink>
        </div>
        {checkError ? <FormAlert>{checkError}</FormAlert> : null}
        {error ? <FormAlert>{error}</FormAlert> : null}
        <div className="mt-4">
          <Button isLoading={mutation.isPending} onClick={submit}>
            동의하고 확인 완료
          </Button>
        </div>
        <MutedNote>{COPY.consentNoCharge}</MutedNote>
      </Card>
    </div>
  );
}

export function ConsentScreen({ noticeId, plan }: { noticeId?: number; plan?: string }) {
  const query = useConsentPreview(plan, noticeId);
  const [stale, setStale] = useState<string>();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="구독 구매 동의"
        description="결제 전에 금액과 기간, 자동갱신, 해지·환불 조건을 확인합니다."
      />
      {stale ? <FormAlert>{stale}</FormAlert> : null}
      <QueryGate query={query} loadingLabel="구독 조건을 불러오는 중입니다.">
        {(preview) => (
          <ConsentForm
            key={`${preview.termsVersion}-${preview.totalAmountInclVat}-${preview.periodStart}`}
            preview={preview}
            onStale={(message) => {
              setStale(message);
              void query.refetch();
            }}
          />
        )}
      </QueryGate>
    </div>
  );
}
