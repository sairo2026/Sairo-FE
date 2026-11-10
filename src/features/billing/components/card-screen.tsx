"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ApiError } from "@/shared/api/client";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { MutedNote, TextLink } from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/select-field";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatSeoulDate } from "@/shared/lib/format";
import type { SubscriptionCurrent } from "../api/wire";
import { deleteBillingKey, openBillingKeySession, registerBillingKey } from "../api/billing.api";
import { billingKeys, useCardNotice, useSubscription } from "../hooks/billing-queries";
import { PaymentWidgetUnavailableError, tossBillingAuthLauncher } from "../lib/payment-widget";
import type { BillingAuthLauncher } from "../lib/payment-widget";
import { COPY, describeBillingError } from "../model/messages";

export const CARD_RESULT_PATH = "/billing/card/result";

function firstBillingText(subscription: SubscriptionCurrent) {
  return subscription.firstBillingScheduledAt
    ? formatSeoulDate(subscription.firstBillingScheduledAt)
    : null;
}

function CardView({
  subscription,
  launcher,
}: {
  subscription: SubscriptionCurrent;
  launcher: BillingAuthLauncher;
}) {
  const queryClient = useQueryClient();
  const notice = useCardNotice();
  const [confirmed, setConfirmed] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const date = firstBillingText(subscription);
  const card = subscription.paymentMethod;
  const noticeItem = notice.data?.items[0];
  const isBusyInvoice =
    subscription.latestInvoice?.status === "PROCESSING" ||
    subscription.latestInvoice?.status === "VERIFYING";

  const open = useMutation({
    mutationFn: async () => {
      if (!launcher.isConfigured()) throw new PaymentWidgetUnavailableError();
      const session = await openBillingKeySession();
      const origin = window.location.origin;
      const version = encodeURIComponent(noticeItem?.version ?? "");
      await launcher.requestBillingAuth({
        customerKey: session.customerKey,
        successUrl: `${origin}${CARD_RESULT_PATH}?v=${version}`,
        failUrl: `${origin}${CARD_RESULT_PATH}`,
      });
    },
    onError: (caught) => {
      setInfo(undefined);
      if (caught instanceof PaymentWidgetUnavailableError) {
        setError(COPY.regPreparing);
        return;
      }
      setError(
        describeBillingError(
          caught,
          "카드 등록 준비 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요. 결제된 금액은 없습니다.",
        ),
      );
    },
  });

  const remove = useMutation({
    mutationFn: deleteBillingKey,
    onSuccess: async () => {
      setRemoving(false);
      setError(undefined);
      setInfo("등록된 카드를 해제했습니다.");
      await queryClient.invalidateQueries({ queryKey: billingKeys.subscription });
    },
    onError: (caught) => {
      setRemoving(false);
      setInfo(undefined);
      setError(
        describeBillingError(caught, "카드를 해제하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."),
      );
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card title="등록된 카드">
        {card ? (
          <div className="flex flex-col gap-3">
            <p className="text-body text-ink">
              {card.cardIssuer ?? "카드"} 끝자리 {card.cardLast4 ?? "----"}
            </p>
            {isBusyInvoice ? (
              <MutedNote>처리 중인 청구가 있어 새 카드 교체는 결과 확인 뒤 완료됩니다.</MutedNote>
            ) : null}
            <div>
              <Button variant="ghost" onClick={() => setRemoving(true)}>
                카드 해제
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-body text-ink-2">등록된 카드가 없습니다.</p>
        )}
      </Card>
      <Card title={card ? "다른 카드로 교체" : "카드 등록"}>
        <p className="mb-4 text-body text-ink">{date ? COPY.regTopWithDate(date) : COPY.regTop}</p>
        {notice.isError ? (
          <FormAlert>카드 등록 안내를 불러오지 못했습니다. 잠시 뒤에 다시 시도해 주세요.</FormAlert>
        ) : null}
        <Checkbox
          checked={confirmed}
          onCheckedChange={setConfirmed}
          label="카드 등록 안내를 확인했습니다"
        />
        {error ? <FormAlert>{error}</FormAlert> : null}
        {info ? <FormNotice>{info}</FormNotice> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            isLoading={open.isPending}
            disabled={!confirmed || !noticeItem}
            onClick={() => {
              setError(undefined);
              setInfo(undefined);
              open.mutate();
            }}
          >
            카드 등록
          </Button>
          <TextLink href="/billing">구독 현황으로</TextLink>
        </div>
      </Card>
      <ConfirmDialog
        isOpen={removing}
        title="카드 해제"
        message="등록된 카드를 해제할까요? 해제해도 이미 결제된 내역은 그대로 남습니다."
        confirmLabel="해제"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setRemoving(false)}
      />
    </div>
  );
}

export function CardScreen({
  launcher = tossBillingAuthLauncher,
}: {
  launcher?: BillingAuthLauncher;
}) {
  const query = useSubscription();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="카드 등록"
        description="자동결제에 쓸 카드를 등록합니다. 등록은 결제 준비이며 청구가 아닙니다."
      />
      <QueryGate query={query} loadingLabel="결제수단을 불러오는 중입니다.">
        {(subscription) => <CardView subscription={subscription} launcher={launcher} />}
      </QueryGate>
    </div>
  );
}

export type CardResultParams = {
  authKey?: string | null;
  customerKey?: string | null;
  version?: string | null;
  failCode?: string | null;
};

export function CardResultScreen({ authKey, customerKey, version, failCode }: CardResultParams) {
  const queryClient = useQueryClient();
  const started = useRef(false);
  const register = useMutation({
    mutationFn: () =>
      registerBillingKey({
        authKey: authKey ?? "",
        customerKey: customerKey ?? "",
        cardNoticeVersion: version ?? "",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.subscription }),
  });
  const hasParams = Boolean(authKey && customerKey) && !failCode;

  useEffect(() => {
    if (!hasParams || started.current) return;
    started.current = true;
    register.mutate();
  }, [hasParams, register]);

  if (!hasParams) {
    return (
      <Result title="카드 등록 결과">
        <FormAlert>
          {failCode === "PAY_PROCESS_CANCELED" || !failCode
            ? COPY.regCanceled
            : "카드를 등록하지 못했습니다. 카드 정보를 확인하거나 다른 카드로 다시 시도해 주세요. 결제된 금액은 없습니다."}
        </FormAlert>
        <TextLink href="/billing/card">카드 등록으로 돌아가기</TextLink>
      </Result>
    );
  }
  if (register.isIdle || register.isPending)
    return <PageSkeleton label="카드를 등록하고 있습니다." />;
  if (register.isError) {
    const code = register.error instanceof ApiError ? register.error.code : "";
    const text =
      code === "INVALID_REQUEST"
        ? "결제수단 등록 정보가 확인되지 않아 등록을 중단했습니다. 결제된 금액은 없습니다. 처음부터 다시 시도해 주세요."
        : describeBillingError(
            register.error,
            "카드를 등록하지 못했습니다. 카드 정보를 확인하거나 다른 카드로 다시 시도해 주세요. 결제된 금액은 없습니다.",
          );
    return (
      <Result title="카드 등록 결과">
        <FormAlert>{text}</FormAlert>
        <TextLink href="/billing/card">카드 등록으로 돌아가기</TextLink>
      </Result>
    );
  }
  const date = register.data.firstBillingScheduledAt
    ? formatSeoulDate(register.data.firstBillingScheduledAt)
    : null;
  return (
    <Result title="카드 등록 결과">
      <FormNotice>{`결제수단이 등록됐습니다. 이번 등록으로 결제된 금액은 없습니다.${date ? ` 첫 결제 예정일은 ${date}입니다.` : ""}`}</FormNotice>
      <TextLink href="/billing">구독 현황으로</TextLink>
    </Result>
  );
}

function Result({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} />
      {children}
    </div>
  );
}
