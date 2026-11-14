"use client";

import Link from "next/link";
import { ApiError } from "@/shared/api/client";
import { Skeleton } from "@/shared/components/feedback/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatKrw } from "@/shared/lib/format";
import { usePublicPricing } from "../hooks/billing-queries";
import { PRICING_COPY, trialNoticeText } from "../model/legal-copy";
import { COPY, describeBillingError } from "../model/messages";
import { tierFormula, tierRange } from "../model/pricing-tier";

const DETAIL_LINK_CLASS =
  "inline-flex min-h-12 items-center rounded-control border border-primary bg-primary-soft px-6 text-body font-semibold text-primary hover:bg-primary-line";

export function PricingSummary() {
  const query = usePublicPricing();

  if (query.isPending) {
    return (
      <div role="status" aria-busy="true" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <span className="sr-only">요금표를 불러오는 중입니다.</span>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (query.isError) {
    const isRateLimited = query.error instanceof ApiError && query.error.status === 429;
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-card-flat border border-line bg-white px-6 py-5"
      >
        <p className="text-body text-ink">
          {isRateLimited
            ? describeBillingError(query.error, COPY.pricingLoadError)
            : COPY.pricingLoadError}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outlined" onClick={() => void query.refetch()}>
            다시 시도
          </Button>
          <Link
            href="/pricing"
            className="text-body font-semibold text-primary underline hover:text-primary-hover active:text-primary-pressed"
          >
            요금 안내로 이동
          </Link>
        </div>
      </div>
    );
  }

  const pricing = query.data;
  const trialText = trialNoticeText(pricing.generalTrial);

  return (
    <div className="flex flex-col gap-6">
      {pricing.provisionalPrice ? (
        <p className="flex flex-wrap items-center gap-2 text-body text-ink">
          <Badge tone="amber">확정 요금</Badge>
          {PRICING_COPY.provisional}
        </p>
      ) : null}
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="pricing-summary-tiers">
        {pricing.plans.map((tier) => (
          <li
            key={`${tier.planCode}-${tier.minMembers}`}
            className="flex flex-col gap-2 rounded-card-flat border border-line bg-white px-6 py-5"
          >
            <h3 className="text-h2 font-semibold text-ink">{tierRange(tier)}</h3>
            <p className="text-body text-ink-2">{tierFormula(tier)}</p>
            <p className="text-caption text-ink-2">
              {PRICING_COPY.planFooter(formatKrw(tier.baseAmount))}
            </p>
          </li>
        ))}
        <li className="flex flex-col gap-2 rounded-card-flat border border-line bg-white px-6 py-5">
          <h3 className="text-h2 font-semibold text-ink">기업</h3>
          <p className="text-body text-ink-2">별도 견적</p>
          <p className="text-caption text-ink-2">{COPY.enterpriseNote}</p>
        </li>
      </ul>
      <p className="text-caption text-ink-2">{COPY.pricingVatNotice}</p>
      <p className={trialText ? "text-body font-semibold text-primary" : "text-body text-ink"}>
        {trialText ?? PRICING_COPY.noTrial}
      </p>
      <div>
        <Link href="/pricing" className={DETAIL_LINK_CLASS}>
          요금 자세히 보기
        </Link>
      </div>
    </div>
  );
}
