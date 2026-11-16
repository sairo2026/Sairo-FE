"use client";

import Image from "next/image";
import Link from "next/link";
import { ApiError } from "@/shared/api/client";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatKrw } from "@/shared/lib/format";
import { PRICING_COPY, trialNoticeText } from "../model/legal-copy";
import { tierFormula, tierRange } from "../model/pricing-tier";
import { describeBillingError, COPY } from "../model/messages";
import { CommerceNotice } from "./commerce-notice";
import type { PublicPricing } from "../api/wire";
import { usePublicPricing } from "../hooks/billing-queries";
import { breakSentences } from "@/shared/lib/sentences";

export function PublicPricingScreen({ initialData }: { initialData?: PublicPricing }) {
  const query = usePublicPricing(initialData);

  if (query.isPending) return <PageSkeleton label="요금표를 불러오는 중입니다." />;
  if (query.isError) {
    const detail = describeBillingError(query.error, COPY.pricingLoadError);
    return (
      <section
        role="alert"
        className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center"
      >
        <h1 className="text-h1 font-bold text-ink">요금 안내</h1>
        <p className="text-body text-ink-2">
          {query.error instanceof ApiError && query.error.status === 429
            ? detail
            : COPY.pricingLoadError}
        </p>
        <Button onClick={() => void query.refetch()}>다시 시도</Button>
      </section>
    );
  }

  const pricing = query.data;
  const trialText = trialNoticeText(pricing.generalTrial);
  const imageUrl = pricing.plans.find((plan) => plan.imageUrl)?.imageUrl ?? null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={COPY.pricingTitle} description={COPY.pricingVatNotice} />
      {pricing.provisionalPrice ? (
        <p className="flex flex-wrap items-center gap-2 text-body text-ink">
          <Badge tone="amber">확정 요금</Badge>
          {PRICING_COPY.provisional}
        </p>
      ) : null}

      <Card title="구간별 요금">
        <ul className="flex flex-col divide-y divide-line">
          {pricing.plans.map((tier) => (
            <li
              key={`${tier.planCode}-${tier.minMembers}`}
              className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-body font-semibold text-ink">{tierRange(tier)}</span>
              <span className="flex flex-col text-body text-ink-2 sm:items-end">
                <span>{tierFormula(tier)} (부가세 포함)</span>
                <span className="text-caption">{PRICING_COPY.planTerms}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={PRICING_COPY.tierGuideTitle}>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body text-ink">
          {PRICING_COPY.tierGuide.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>

      <Card title="인원별 월 금액 예시">
        <table className="w-full text-left text-body">
          <caption className="sr-only">1명부터 10명까지 인원별 월 금액 예시</caption>
          <thead>
            <tr className="text-body font-bold text-ink">
              <th scope="col" className="h-[60px] border-b border-line py-0 text-left font-bold">
                이용 인원
              </th>
              <th scope="col" className="h-[60px] border-b border-line py-0 text-left font-bold">
                월 금액 (부가세 포함)
              </th>
            </tr>
          </thead>
          <tbody>
            {pricing.examples.map((example) => (
              <tr key={example.members} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-4 text-body font-medium">
                  {example.members}명
                </th>
                <td className="py-4 text-body font-medium">{formatKrw(example.monthlyAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="무료 이용 기간">
        <p className={trialText ? "text-body font-semibold text-primary" : "text-body text-ink"}>
          {trialText ?? PRICING_COPY.noTrial}
        </p>
      </Card>

      <Card title={PRICING_COPY.paymentTitle}>
        <p className="text-body text-ink">{PRICING_COPY.payment}</p>
        <p className="mt-3 whitespace-pre-line text-body text-ink">
          {breakSentences(COPY.pricingRefundSummary)}{" "}
          <Link
            href="/legal/refund-policy"
            className="font-semibold text-primary underline clickable-link"
          >
            {COPY.pricingRefundLink}
          </Link>
        </p>
        <p className="mt-3 flex flex-wrap gap-x-2 text-caption text-ink-2">
          {PRICING_COPY.links.map((item, index) => (
            <span key={item.href}>
              {index > 0 ? <span aria-hidden>· </span> : null}
              <Link href={item.href} className="underline clickable-link">
                {item.label}
              </Link>
            </span>
          ))}
        </p>
      </Card>

      {imageUrl ? (
        <div
          className="flex min-h-24 items-center justify-center rounded-card-flat bg-surface px-4 py-6"
          data-testid="pricing-image"
        >
          <Image
            src={imageUrl}
            alt="요금제에서 사용하는 사이로 업무 화면 예시"
            width={960}
            height={540}
            unoptimized
            className="h-auto max-h-64 w-auto"
          />
        </div>
      ) : null}

      <CommerceNotice />

      <div className="flex flex-col items-start gap-2">
        <Link
          href="/signup"
          className="inline-flex h-14 items-center rounded-control bg-primary px-6 text-body font-bold text-white hover:bg-primary-hover"
        >
          {COPY.pricingEntry}
        </Link>
        <p className="text-caption text-ink-2">{COPY.pricingEntryNote}</p>
      </div>
    </div>
  );
}
