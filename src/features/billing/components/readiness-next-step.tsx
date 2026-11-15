import Link from "next/link";
import { FormNotice } from "@/shared/components/feedback/form-frame";
import { MutedNote, TextLink } from "@/shared/components/feedback/page-parts";
import type { SubscriptionCurrent } from "../api/wire";

type Step = "card" | "consent";

const STEPS: Record<Step, { href: string; missing: string; action: string }> = {
  card: { href: "/billing/card", missing: "카드 등록", action: "카드 등록하기" },
  consent: { href: "/billing/consent", missing: "구독 구매 동의", action: "구독 구매 동의하기" },
};

function isDone(subscription: SubscriptionCurrent, step: Step): boolean {
  return step === "card"
    ? subscription.readiness.hasBillingKey
    : subscription.readiness.hasValidConsent;
}

/** 방금 끝낸 단계의 상대 단계가 남아 있으면 그 단계를 주 버튼으로 안내하고 둘 다 끝났으면 준비 완료를 알린다. */
export function ReadinessNextStep({
  subscription,
  completed,
}: {
  subscription: SubscriptionCurrent | undefined;
  completed: Step;
}) {
  const other: Step = completed === "card" ? "consent" : "card";
  const back = <TextLink href="/billing">구독 현황으로</TextLink>;
  if (!subscription) return back;
  if (isDone(subscription, other)) {
    return (
      <div className="flex flex-col gap-3">
        <FormNotice>카드 등록과 구독 구매 동의가 모두 끝나 결제 준비가 완료됐습니다.</FormNotice>
        {back}
      </div>
    );
  }
  const step = STEPS[other];
  return (
    <div className="flex flex-col gap-3">
      <MutedNote>
        결제 준비에는 {step.missing}도 필요합니다. 아래 버튼으로 이어서 진행해 주세요.
      </MutedNote>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={step.href}
          className="inline-flex h-12 items-center rounded-control bg-primary px-8 font-bold text-white hover:bg-primary-hover active:bg-primary-pressed"
        >
          {step.action}
        </Link>
        {back}
      </div>
    </div>
  );
}
