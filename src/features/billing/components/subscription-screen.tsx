"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { SubscriptionCurrentResponse } from "@/lib/api/contracts/billing.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import {
  DetailList,
  MutedNote,
  StatusBadge,
  TextLink,
} from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import {
  cancelSubscription,
  requestFirstPayment,
  requestRetryPayment,
  withdrawCancellation,
} from "../api/billing.api";
import { billingKeys, useSubscription } from "../hooks/billing-queries";
import { SUBSCRIPTION_STATUS, labelOf, PLAN_LABEL } from "../model/labels";
import { COPY, describeBillingError } from "../model/messages";

const DAY_MS = 86_400_000;
const REMINDER_DAYS = [30, 14, 7, 1];

export function daysUntil(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - now;
  return Number.isFinite(diff) ? Math.ceil(diff / DAY_MS) : null;
}

export function trialReminder(trialEndsAt: string | null | undefined, now = Date.now()) {
  const days = daysUntil(trialEndsAt, now);
  if (days === null || days < 0) return null;
  const threshold = REMINDER_DAYS.find((limit) => days <= limit);
  return threshold === undefined ? null : days;
}

function ReadinessList({ subscription }: { subscription: SubscriptionCurrentResponse }) {
  const items = [
    { ok: subscription.readiness.hasBillingKey, label: "카드 등록", href: "/billing/card" },
    {
      ok: subscription.readiness.hasValidConsent,
      label: "구독 구매 동의",
      href: "/billing/consent",
    },
  ];
  return (
    <ul className="flex flex-col gap-2" aria-label="결제 준비 상태">
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between gap-3 text-body">
          <span>
            {item.label}{" "}
            <span className={item.ok ? "font-semibold text-primary" : "font-semibold text-danger"}>
              {item.ok ? "완료" : "필요"}
            </span>
          </span>
          {item.ok ? null : <TextLink href={item.href}>{item.label}하기</TextLink>}
        </li>
      ))}
    </ul>
  );
}

function StatusBody({ subscription }: { subscription: SubscriptionCurrentResponse }) {
  const { status } = subscription;
  const reminder = trialReminder(subscription.trialEndsAt);
  const isReady = subscription.readiness.hasBillingKey && subscription.readiness.hasValidConsent;
  const unusableCard = subscription.latestInvoice?.lastFailureCategory === "CARD_UNUSABLE";

  if (status === "TRIAL") {
    return (
      <div className="flex flex-col gap-3">
        {subscription.trialEndsAt ? (
          <p className="text-body text-ink">
            {COPY.trialLine(formatSeoulDate(subscription.trialEndsAt))}
          </p>
        ) : null}
        {reminder !== null ? (
          <p role="status" className="text-body font-semibold text-primary">
            무료 종료까지 {reminder}일 남았습니다.
          </p>
        ) : null}
        {subscription.firstBillingScheduledAt ? (
          <p className="text-body text-ink-2">
            첫 결제 예정 {formatSeoulDateTime(subscription.firstBillingScheduledAt)}. 결제 준비와
            실제 청구 시작은 다릅니다.
          </p>
        ) : null}
        <ReadinessList subscription={subscription} />
        {isReady ? null : (
          <MutedNote>
            카드 등록과 구독 구매 동의를 마치지 않으면 무료 종료 뒤 구독을 종료하지 않고 결제 전
            상태로 두며, 30일 뒤 종료됩니다.
          </MutedNote>
        )}
      </div>
    );
  }
  if (status === "PRE_PAYMENT") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body text-ink">결제 준비 중입니다. 실제 청구가 시작된 것이 아닙니다.</p>
        {subscription.prePaymentSince ? (
          <p className="text-body text-ink-2">
            결제 전 상태 시작 {formatSeoulDateTime(subscription.prePaymentSince)}
          </p>
        ) : null}
        {subscription.firstBillingScheduledAt ? (
          <p className="text-body text-ink-2">
            첫 청구 예정 {formatSeoulDateTime(subscription.firstBillingScheduledAt)}
          </p>
        ) : null}
        <ReadinessList subscription={subscription} />
      </div>
    );
  }
  if (status === "PAST_DUE_GRACE" || status === "PAST_DUE_RESTRICTED") {
    return (
      <div className="flex flex-col gap-3">
        <DetailList
          items={[
            { label: "밀린 금액", value: formatKrw(subscription.outstandingAmount) },
            {
              label: "미납 시작",
              value: subscription.pastDueSince
                ? formatSeoulDateTime(subscription.pastDueSince)
                : "-",
            },
            {
              label: "제한 시작",
              value: subscription.restrictedAt
                ? formatSeoulDateTime(subscription.restrictedAt)
                : "-",
            },
            {
              label: "구독 종료",
              value: subscription.terminationAt
                ? formatSeoulDateTime(subscription.terminationAt)
                : "-",
            },
          ]}
        />
        <p className="text-body text-ink">
          {status === "PAST_DUE_GRACE"
            ? "이용료 결제에 실패했습니다. 유예 기간에는 지금처럼 이용하실 수 있습니다. 결제수단을 확인하거나 지금 다시 결제해 주세요."
            : "이용료가 납부되지 않아 새 업무 입력이 제한됐습니다. 자료 조회와 내보내기, 결제, 해지는 계속 가능합니다."}
        </p>
        {unusableCard ? (
          <p role="alert" className="text-body font-semibold text-danger">
            등록한 카드를 사용할 수 없습니다. 다른 카드로 교체해 주세요.
          </p>
        ) : null}
        {subscription.latestInvoice?.nextRetryAt ? (
          <MutedNote>
            다음 자동 재시도 {formatSeoulDateTime(subscription.latestInvoice.nextRetryAt)}
          </MutedNote>
        ) : null}
      </div>
    );
  }
  if (status === "SUSPENDED") {
    return (
      <p className="text-body text-ink">
        사무소 인증이 중단되어 자동결제가 멈췄습니다.{" "}
        <TextLink href="/billing/auth-suspension">인증 중단 안내 보기</TextLink>
      </p>
    );
  }
  if (status === "ENDED") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body text-ink">구독이 종료됐습니다.</p>
        {subscription.isInReturnPeriod && subscription.returnPeriodEndsAt ? (
          <p className="text-body text-ink-2">
            {formatSeoulDate(subscription.returnPeriodEndsAt)}까지 자료를 내보낼 수 있습니다.
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {subscription.cancellationEffectiveAt ? (
        <p className="text-body text-ink">
          {COPY.cancelledNote(formatSeoulDateTime(subscription.cancellationEffectiveAt))}
        </p>
      ) : (
        <p className="text-body text-ink">
          {subscription.nextChargeAt
            ? `다음 결제일 ${formatSeoulDate(subscription.nextChargeAt)} · 예정 금액 ${formatKrw(subscription.nextChargeAmount)}(VAT 포함)`
            : "다음 결제 정보가 없습니다."}
        </p>
      )}
      <MutedNote>
        결제일이 없는 달에는 그 달 마지막 날에 결제되고, 다음 달에는 원래 결제일로 돌아갑니다.
      </MutedNote>
    </div>
  );
}

function SubscriptionActions({ subscription }: { subscription: SubscriptionCurrentResponse }) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<"cancel" | "withdraw" | null>(null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const refresh = () => queryClient.invalidateQueries({ queryKey: billingKeys.subscription });
  const onError = async (caught: unknown) => {
    setDialog(null);
    setNotice(undefined);
    setError(describeBillingError(caught, "처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."));
    await refresh();
  };

  const firstPayment = useMutation({
    mutationFn: requestFirstPayment,
    onSuccess: async () => {
      setError(undefined);
      setNotice("결제가 완료됐습니다.");
      await refresh();
    },
    onError,
  });
  const retry = useMutation({
    mutationFn: requestRetryPayment,
    onSuccess: async () => {
      setError(undefined);
      setNotice("결제가 완료됐습니다.");
      await refresh();
    },
    onError,
  });
  const cancel = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: async (result) => {
      setDialog(null);
      setError(undefined);
      setNotice(COPY.cancelDone(formatSeoulDateTime(result.effectiveAt)));
      await refresh();
    },
    onError,
  });
  const withdraw = useMutation({
    mutationFn: withdrawCancellation,
    onSuccess: async () => {
      setDialog(null);
      setError(undefined);
      setNotice(COPY.cancelWithdrawDone);
      await refresh();
    },
    onError,
  });

  const { status } = subscription;
  const isReady = subscription.readiness.hasBillingKey && subscription.readiness.hasValidConsent;
  const isPaying = firstPayment.isPending || retry.isPending;
  const canRetry =
    (status === "PAST_DUE_GRACE" || status === "PAST_DUE_RESTRICTED" || status === "ENDED") &&
    (subscription.isInReturnPeriod || status !== "ENDED");
  const canCancel =
    (status === "TRIAL" || status === "ACTIVE") && !subscription.cancellationEffectiveAt;
  const endDate = subscription.cancellationEffectiveAt ?? subscription.currentPeriodEnd;

  return (
    <div className="flex flex-col gap-3">
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      {isPaying ? <MutedNote>{COPY.payProcessing}</MutedNote> : null}
      <div className="flex flex-wrap gap-3">
        {status === "PRE_PAYMENT" ? (
          <Button
            isLoading={firstPayment.isPending}
            disabled={!isReady || isPaying}
            onClick={() => firstPayment.mutate()}
          >
            지금 결제
          </Button>
        ) : null}
        {canRetry ? (
          <Button
            isLoading={retry.isPending}
            disabled={!subscription.canRetryPayment || isPaying}
            onClick={() => retry.mutate()}
          >
            지금 재결제
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="ghost" onClick={() => setDialog("cancel")}>
            해지 예약
          </Button>
        ) : null}
        {subscription.cancellationEffectiveAt && status !== "ENDED" ? (
          <Button variant="outlined" onClick={() => setDialog("withdraw")}>
            해지 예약 취소
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        isOpen={dialog === "cancel"}
        title="해지 예약"
        message={COPY.cancelConfirm(formatSeoulDateTime(endDate))}
        confirmLabel="해지 예약"
        isPending={cancel.isPending}
        onConfirm={() => cancel.mutate()}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        isOpen={dialog === "withdraw"}
        title="해지 예약 취소"
        message={COPY.cancelWithdrawConfirm(
          subscription.nextChargeAt ? formatSeoulDate(subscription.nextChargeAt) : null,
          subscription.nextChargeAmount ? formatKrw(subscription.nextChargeAmount) : null,
        )}
        confirmLabel="예약 취소"
        isPending={withdraw.isPending}
        onConfirm={() => withdraw.mutate()}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

function SubscriptionView({ subscription }: { subscription: SubscriptionCurrentResponse }) {
  const status = labelOf(SUBSCRIPTION_STATUS, subscription.status);
  return (
    <div className="flex flex-col gap-6">
      <Card title="구독 현황">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StatusBadge tone={status?.tone ?? "gray"} label={status?.label ?? subscription.status} />
          <span className="text-body text-ink-2">
            {PLAN_LABEL[subscription.plan] ?? subscription.plan} · 과금 인원{" "}
            {subscription.memberCount}명 · 가격 버전 {subscription.priceVersion}
          </span>
        </div>
        <StatusBody subscription={subscription} />
        <div className="mt-5">
          <SubscriptionActions subscription={subscription} />
        </div>
      </Card>
      <Card title="결제수단">
        {subscription.paymentMethod ? (
          <p className="text-body text-ink">
            {subscription.paymentMethod.cardIssuer ?? "카드"} 끝자리{" "}
            {subscription.paymentMethod.cardLast4 ?? "----"}
          </p>
        ) : (
          <p className="text-body text-ink-2">
            등록된 카드가 없습니다. 카드를 등록해도 지금 결제되지 않습니다.
          </p>
        )}
        <div className="mt-3">
          <Link
            href="/billing/card"
            className="text-caption font-semibold text-primary hover:underline"
          >
            {subscription.paymentMethod ? "카드 관리" : "카드 등록"}
          </Link>
        </div>
      </Card>
      <Card title="요금과 내역">
        <ul className="flex flex-col gap-2 text-body">
          <li>
            <TextLink href="/billing/plans">요금제 안내와 예상 금액</TextLink>
          </li>
          <li>
            <TextLink href="/billing/consent">구독 구매 동의</TextLink>
          </li>
          <li>
            <TextLink href="/billing/invoices">결제 내역</TextLink>
          </li>
          <li>
            <TextLink href="/billing/refunds">환불 신청 내역</TextLink>
          </li>
        </ul>
      </Card>
    </div>
  );
}

export function SubscriptionScreen() {
  const query = useSubscription();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="구독·결제" description="구독 상태와 결제수단, 결제 내역을 확인합니다." />
      <QueryGate query={query} loadingLabel="구독 현황을 불러오는 중입니다.">
        {(subscription) => <SubscriptionView subscription={subscription} />}
      </QueryGate>
    </div>
  );
}
