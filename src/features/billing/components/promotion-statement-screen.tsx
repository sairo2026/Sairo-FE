"use client";

import Link from "next/link";
import { usePromotionPeriods } from "../hooks/billing-queries";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { PLAN_LABEL } from "../model/labels";

export function PromotionStatementScreen({ id }: { id: number }) {
  const periods = usePromotionPeriods();

  return (
    <div className="mx-auto min-h-screen max-w-[800px] bg-white px-5 py-8 text-ink sm:px-12 sm:py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          className="text-body font-semibold text-primary hover:underline"
          href="/billing/promotion-periods"
        >
          이용내역으로 돌아가기
        </Link>
        <Button
          type="button"
          disabled={!periods.isSuccess || !periods.data.some((item) => item.id === id)}
          onClick={() => window.print()}
        >
          인쇄 또는 PDF로 저장
        </Button>
      </div>
      <QueryGate query={periods} loadingLabel="이용내역서를 불러오는 중입니다.">
        {(items) => {
          const period = items.find((item) => item.id === id);
          if (!period) return <p role="alert">이용내역서를 찾을 수 없습니다.</p>;
          return (
            <article
              aria-label="무료 프로모션 이용내역서"
              className="border border-line p-5 sm:p-8 print:border-0 print:p-0"
            >
              <p className="text-body font-semibold text-primary">SAIRO</p>
              <h1 className="mt-2 text-h1 font-bold">무료 프로모션 이용내역서</h1>
              <p className="mt-2 text-body text-ink-2">
                카드 승인이나 매출전표가 발생하지 않은 내부 구독 이용 기록입니다.
              </p>
              <dl className="mt-8 grid gap-x-8 gap-y-4 border-y border-line py-6 text-body sm:grid-cols-2">
                <div>
                  <dt className="text-ink-2">서비스</dt>
                  <dd>사이로 구독 서비스</dd>
                </div>
                <div>
                  <dt className="text-ink-2">상품</dt>
                  <dd>{PLAN_LABEL[period.plan as keyof typeof PLAN_LABEL] ?? period.plan}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">사무소</dt>
                  <dd>{period.officeName}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">내부 이용내역 번호</dt>
                  <dd>{period.id}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">이용기간</dt>
                  <dd>
                    {formatSeoulDateTime(period.periodStart)} ~{" "}
                    {formatSeoulDateTime(period.periodEnd)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-2">발급 기록 시각</dt>
                  <dd>{formatSeoulDateTime(period.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">프로모션</dt>
                  <dd>{period.campaignName}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">가격 버전</dt>
                  <dd>{period.priceVersion}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">다음 무료 갱신 예정</dt>
                  <dd>
                    {new Date(period.periodEnd) < new Date(period.freeEndsAt)
                      ? formatSeoulDateTime(period.periodEnd)
                      : "없음"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-2">향후 유료 청구</dt>
                  <dd>자동 청구 없음 · 별도 구매 확인 필요</dd>
                </div>
              </dl>
              <dl className="mt-6 flex flex-col gap-3 text-body">
                <div className="flex justify-between">
                  <dt>구독 정상가</dt>
                  <dd>{formatKrw(period.listAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>프로모션 할인</dt>
                  <dd>-{formatKrw(period.discountAmount)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3 font-bold">
                  <dt>최종 청구액</dt>
                  <dd>{formatKrw(period.chargedAmount)}</dd>
                </div>
              </dl>
              <p className="mt-8 text-body text-ink-2">
                실제 카드 청구액 {formatKrw(period.chargedAmount)} · 카드 승인 없음
              </p>
              <p className="mt-2 text-caption text-ink-2">
                이 문서는 카드 영수증, 매출전표 또는 세금계산서가 아닙니다.
              </p>
            </article>
          );
        }}
      </QueryGate>
    </div>
  );
}
