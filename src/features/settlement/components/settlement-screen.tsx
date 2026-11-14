"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { FormNotice } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatCount, formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { useSettlement, useSettlementList } from "../hooks/settlement-queries";
import { METRIC_GROUPS, currentYearMonth, isYearMonth, shiftYearMonth } from "../model/metrics";
import type { MetricDef } from "../model/metrics";
import { MemoPanel } from "./memo-panel";

function formatValue(def: MetricDef, value: number): string {
  return def.kind === "money" ? formatKrw(value) : `${formatCount(value)}${def.unit ?? ""}`;
}

function MonthNav({ yearMonth, earliest }: { yearMonth: string; earliest: string }) {
  const router = useRouter();
  const latest = currentYearMonth();
  const prev = shiftYearMonth(yearMonth, -1);
  const next = shiftYearMonth(yearMonth, 1);
  const canPrev = prev >= earliest;
  const canNext = next <= latest;
  const go = (month: string) => router.push(`/settlements?month=${month}`);
  return (
    <div className="flex items-center gap-2" role="group" aria-label="월 선택">
      <Button
        variant="ghost"
        size="sm"
        disabled={!canPrev}
        onClick={() => go(prev)}
        aria-label="이전 달"
      >
        이전 달
      </Button>
      <span className="min-w-28 text-center text-h2 font-semibold text-ink">
        {yearMonth.replace("-", "년 ")}월
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={!canNext}
        onClick={() => go(next)}
        aria-label="다음 달"
      >
        다음 달
      </Button>
    </div>
  );
}

function SettlementBody({ yearMonth }: { yearMonth: string }) {
  const query = useSettlement(yearMonth);
  const isCurrent = yearMonth === currentYearMonth();
  const detailHref = (metric: string) => `/settlements/${yearMonth}/details?metric=${metric}`;
  return (
    <QueryGate query={query} loadingLabel="월말결산을 불러오는 중입니다.">
      {(data) => (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            {isCurrent || !data.isFinalized ? (
              <Badge tone="amber">집계 중</Badge>
            ) : (
              <Badge tone="green">집계 완료</Badge>
            )}
            <span className="text-caption text-ink-2">
              집계 기준 시각 {formatSeoulDateTime(data.asOf)}
            </span>
            <a
              href={`/api/settlements/${yearMonth}/export`}
              download
              className="ml-auto text-caption font-semibold text-primary hover:underline"
            >
              CSV 내려받기
            </a>
          </div>
          {data.agreedFeeUndatedCount > 0 ? (
            <FormNotice>
              잔금 예정일이 없어 잔금 기준 약정보수에서 빠진 계약이 {data.agreedFeeUndatedCount}건
              있습니다.{" "}
              <Link href={detailHref("agreedFeeUndatedCount")} className="font-semibold underline">
                빠진 계약 보기
              </Link>
            </FormNotice>
          ) : null}
          <ul
            aria-label="월말결산 지표"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {METRIC_GROUPS.map((group) => (
              <li key={group.id}>
                <section
                  aria-label={group.title}
                  className="flex h-full flex-col gap-3 rounded-card-flat border border-line bg-white px-6 py-5"
                >
                  <h2 className="text-body font-semibold text-ink-2">{group.title}</h2>
                  {group.metrics.map((def) => (
                    <Link
                      key={def.key}
                      href={detailHref(def.key)}
                      aria-label={`${def.label} ${formatValue(def, data[def.key])} 상세 내역`}
                      className="flex items-baseline justify-between gap-3 rounded-control px-2 py-1 hover:bg-primary-soft"
                    >
                      <span className="text-caption text-ink-2">{def.label}</span>
                      <span className="text-h2 font-bold text-primary">
                        {formatValue(def, data[def.key])}
                      </span>
                    </Link>
                  ))}
                  {group.id === "new" ? (
                    <p className="text-caption text-ink-2">
                      데이터 이전으로 등록: 매물{" "}
                      <Link
                        href={detailHref("propertyCountNewMigrated")}
                        className="font-semibold underline"
                      >
                        {data.propertyCountNewMigrated}건
                      </Link>
                      , 고객{" "}
                      <Link
                        href={detailHref("customerCountNewMigrated")}
                        className="font-semibold underline"
                      >
                        {data.customerCountNewMigrated}명
                      </Link>
                    </p>
                  ) : null}
                  {group.id === "outstanding" || group.id === "overcollected" ? (
                    <p className="text-caption text-ink-3">
                      사무소 합계입니다. 지급의무자별 내역은 상세 내역에서 봅니다.
                    </p>
                  ) : null}
                </section>
              </li>
            ))}
          </ul>
          <MemoPanel yearMonth={yearMonth} />
        </div>
      )}
    </QueryGate>
  );
}

export function SettlementScreen() {
  const { role } = useOfficeAccess();
  const params = useSearchParams();
  const list = useSettlementList();
  const requested = params.get("month");
  const latest = currentYearMonth();
  const months = (list.data?.items ?? []).map((item) => item.yearMonth).sort();
  const earliest = months[0] ?? latest;
  const yearMonth =
    isYearMonth(requested) && requested >= earliest && requested <= latest ? requested : latest;

  if (role === "DEPUTY") return <ErrorScreen kind="forbidden" />;
  if (list.isError && list.error instanceof ApiError && [403, 429].includes(list.error.status)) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(list.error)}
        retryAfterSeconds={list.error.retryAfterSeconds}
        onRetry={() => void list.refetch()}
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="월말결산"
        description="한 달 동안의 실적을 지표로 봅니다. 지표를 누르면 원본 목록으로 들어갑니다."
        actions={<MonthNav yearMonth={yearMonth} earliest={earliest} />}
      />
      <SettlementBody yearMonth={yearMonth} />
    </div>
  );
}
