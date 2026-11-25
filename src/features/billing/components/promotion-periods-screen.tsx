"use client";

import Link from "next/link";
import { useCurrentPromotion, usePromotionPeriods } from "../hooks/billing-queries";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";

export function PromotionPeriodsScreen() {
  const periods = usePromotionPeriods();
  const current = useCurrentPromotion();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="무료 프로모션 이용내역"
        description="카드 결제 없이 제공된 구독기간과 할인 내역을 확인합니다."
      />
      <QueryGate query={current} loadingLabel="프로모션 상태를 불러오는 중입니다.">
        {(promotion) =>
          promotion ? (
            <Card title="현재 프로모션">
              <dl className="grid gap-3 text-body sm:grid-cols-2">
                <div>
                  <dt className="text-ink-2">캠페인</dt>
                  <dd>{promotion.campaignName}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">무료 종료</dt>
                  <dd>{formatSeoulDateTime(promotion.freeEndsAt)}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">다음 무료 갱신</dt>
                  <dd>
                    {promotion.nextFreeRenewalAt
                      ? formatSeoulDateTime(promotion.nextFreeRenewalAt)
                      : "없음"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-2">유료 전환</dt>
                  <dd>
                    {promotion.conversionStatus === "RECONCILIATION_REQUIRED"
                      ? "무료 이용기간 기록 확인 중 · 자동 청구 없음"
                      : promotion.conversionStatus === "CONVERSION_PENDING"
                        ? "무료 이용 종료 · 유료 구독 확인 대기"
                        : "별도 구매 확인 필요"}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-body text-ink-2">
                무료 종료만으로 카드가 자동 청구되지 않습니다. 향후 유료 구독을 선택할 경우 결제
                금액과 조건을 다시 확인합니다.
                {promotion.potentialPaidAmount === null
                  ? null
                  : ` 현재 요금 기준 예상 월 금액은 ${formatKrw(promotion.potentialPaidAmount)}입니다.`}
              </p>
              {promotion.conversionStatus === "CONVERSION_PENDING" ? (
                <Link
                  className="mt-4 inline-block text-body font-semibold text-primary hover:underline"
                  href="/billing/consent"
                >
                  유료 구독 조건 확인하기
                </Link>
              ) : null}
            </Card>
          ) : null
        }
      </QueryGate>
      <QueryGate query={periods} loadingLabel="무료 이용내역을 불러오는 중입니다.">
        {(items) =>
          items.length === 0 ? (
            <Card>
              <p className="text-body text-ink-2">무료 프로모션 이용내역이 없습니다.</p>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="무료 프로모션 월별 이용내역">
              {items.map((item) => (
                <li key={item.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-h2 font-semibold text-ink">{item.campaignName}</h2>
                        <p className="text-body text-ink-2">
                          {formatSeoulDate(item.periodStart)} ~ {formatSeoulDate(item.periodEnd)}
                        </p>
                      </div>
                      <Link
                        className="text-body font-semibold text-primary hover:underline"
                        href={`/billing/promotion-periods/${item.id}`}
                      >
                        이용내역서 보기
                      </Link>
                    </div>
                    <dl className="mt-4 grid gap-2 text-body sm:grid-cols-3">
                      <div>
                        <dt className="text-ink-2">정상가</dt>
                        <dd>{formatKrw(item.listAmount)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-2">프로모션 할인</dt>
                        <dd>-{formatKrw(item.discountAmount)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-2">실제 카드 청구</dt>
                        <dd className="font-semibold">{formatKrw(item.chargedAmount)}</dd>
                      </div>
                    </dl>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </QueryGate>
    </div>
  );
}
