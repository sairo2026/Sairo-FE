"use client";

import Link from "next/link";
import { useState } from "react";
import type { BillingPlanListResponse } from "@/lib/api/contracts/billing.schema";
import { MutedNote, StatusBadge } from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { TextField } from "@/shared/components/ui/text-field";
import { formatKrw } from "@/shared/lib/format";
import { useBillingPlans } from "../hooks/billing-queries";
import { PLAN_LABEL, isMissing } from "../model/labels";
import { COPY } from "../model/messages";
import { estimateMonthly } from "../model/pricing";

function rangeText(minMembers: number, maxMembers: number | null | undefined) {
  if (isMissing(maxMembers)) return `${minMembers}인 이상`;
  return minMembers === maxMembers ? `${minMembers}인` : `${minMembers}~${maxMembers}인`;
}

function PlansView({ data }: { data: BillingPlanListResponse }) {
  const [input, setInput] = useState(String(data.memberCount));
  const members = Number(input);
  const estimate = estimateMonthly(data.plans, members);
  const current = estimateMonthly(data.plans, data.memberCount);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge
          tone={data.priceKind === "START_CUSTOMER" ? "teal" : "blue"}
          label={data.priceKind === "START_CUSTOMER" ? "시작 고객 가격" : "표준 가격"}
        />
        <span className="text-caption text-ink-2">적용 가격 버전 {data.priceVersion}</span>
      </div>
      <p className="text-body text-ink-2">{COPY.pricingVatNotice}</p>
      {data.plans.map((plan) => (
        <Card key={plan.planCode} title={`${PLAN_LABEL[plan.planCode] ?? plan.planCode} 요금제`}>
          {plan.tiers.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-body text-ink">별도 견적으로 안내합니다.</p>
              <MutedNote>{COPY.enterpriseNote}</MutedNote>
              <Link href="/support" className="text-caption font-semibold text-primary underline">
                도입 문의
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {plan.tiers.map((tier) => (
                <li
                  key={tier.minMembers}
                  className="flex flex-wrap justify-between gap-2 py-3 text-body"
                >
                  <span className="font-semibold">
                    {rangeText(tier.minMembers, tier.maxMembers)}
                  </span>
                  <span className="text-ink-2">
                    {tier.perSeatPrice
                      ? `${formatKrw(tier.basePrice)} + (인원 - ${tier.includedMembers}) × ${formatKrw(tier.perSeatPrice)}`
                      : `${formatKrw(tier.basePrice)}`}{" "}
                    (VAT 포함)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
      <Card title="예상 금액">
        <p className="mb-3 text-body text-ink">
          현재 과금 인원 {data.memberCount}명 기준{" "}
          {current === null ? "미확인" : formatKrw(current)}(VAT 포함)
        </p>
        <TextField
          label="인원 수로 계산해 보기"
          kind="number"
          inputMode="numeric"
          value={input}
          onValueChange={(next) => setInput(next.replace(/\D/g, ""))}
        />
        <p className="mt-3 text-body font-semibold text-primary" aria-live="polite">
          {estimate === null
            ? "1명 이상의 인원을 입력해 주세요."
            : `${members}명: ${formatKrw(estimate)} / 월`}
        </p>
        <MutedNote>
          실제 청구는 결제 심사 완료 후 시작합니다. 요금제는 연 결제 없이 월 선불 자동결제입니다.
        </MutedNote>
      </Card>
    </div>
  );
}

export function BillingPlansScreen() {
  const query = useBillingPlans();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="요금제 안내"
        description="사무소 단위 월 구독 요금과 현재 인원 기준 예상 금액입니다."
      />
      <QueryGate query={query} loadingLabel="요금제를 불러오는 중입니다.">
        {(data) => <PlansView data={data} />}
      </QueryGate>
    </div>
  );
}
