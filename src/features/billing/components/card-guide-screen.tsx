"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FlowFrame } from "@/shared/components/feedback/page-parts";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { formatSeoulDate } from "@/shared/lib/format";
import { useSubscription } from "../hooks/billing-queries";
import { COPY } from "../model/messages";

export const CARD_GUIDE_SKIP_KEY = "sairo.billing.card-guide.skipped";

function readSkipped(): boolean {
  try {
    return window.sessionStorage.getItem(CARD_GUIDE_SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSkipped() {
  try {
    window.sessionStorage.setItem(CARD_GUIDE_SKIP_KEY, "1");
  } catch {
    return;
  }
}

const SKIP_STATUSES = ["ENDED", "SUSPENDED"];

/** 로그인 직후 대표에게 카드 등록을 한 번 안내한다. 카드 등록은 결제 준비이며 청구가 아니다. */
export function CardGuideScreen() {
  const router = useRouter();
  const query = useSubscription();
  const subscription = query.data;
  const shouldSkip =
    subscription !== undefined &&
    (subscription.readiness.hasBillingKey || SKIP_STATUSES.includes(subscription.status));

  useEffect(() => {
    if (query.isError || shouldSkip || readSkipped()) router.replace("/");
  }, [query.isError, shouldSkip, router]);

  if (query.isPending) return <PageSkeleton label="구독 상태를 확인하는 중입니다." />;
  if (query.isError) return <ErrorScreen kind="server" onRetry={() => void query.refetch()} />;
  if (shouldSkip) return <PageSkeleton label="이동하는 중입니다." />;

  const date = subscription?.firstBillingScheduledAt
    ? formatSeoulDate(subscription.firstBillingScheduledAt)
    : null;
  return (
    <FlowFrame
      title="카드를 등록해 두세요"
      description={date ? COPY.regTopWithDate(date) : COPY.regTop}
      width="md"
    >
      <p className="text-body text-ink-2">
        무료 이용 기간에도 미리 카드를 등록해 두면 유료 전환 때 이용이 끊기지 않습니다. 카드 등록은
        결제 준비이며 청구가 아닙니다.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => router.push("/billing/card")}>카드 등록하기</Button>
        <Button
          variant="ghost"
          onClick={() => {
            writeSkipped();
            router.replace("/");
          }}
        >
          나중에 하기
        </Button>
      </div>
    </FlowFrame>
  );
}
