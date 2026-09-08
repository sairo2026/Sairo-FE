"use client";

import Link from "next/link";
import { EntityLoadError } from "@/shared/components/entity-load-error";
import {
  coordinationStatusLabels,
  coordinationStatusBadgeClassNames,
} from "@/features/coordination/model/coordination";
import type { CoordinationStatusCounts } from "@/features/coordination/schemas/coordination.schema";
import { useHomeSummary } from "../hooks/use-home-summary";

const STATUS_WIDGET_ORDER: (keyof CoordinationStatusCounts)[] = [
  "tenantChecking",
  "buyerDeliveryRequired",
  "buyerChecking",
  "finalConfirmationRequired",
  "scheduleConfirmed",
  "visitCompleted",
];

const STATUS_WIDGET_KEY_TO_STATUS = {
  tenantChecking: "TENANT_CHECKING",
  buyerDeliveryRequired: "BUYER_DELIVERY_REQUIRED",
  buyerChecking: "BUYER_CHECKING",
  finalConfirmationRequired: "FINAL_CONFIRMATION_REQUIRED",
  scheduleConfirmed: "SCHEDULE_CONFIRMED",
  visitCompleted: "VISIT_COMPLETED",
} as const;

export function HomeDashboard() {
  const { state, retry } = useHomeSummary();

  if (state.status === "loading") {
    return <p className="text-slate-500">홈 정보를 불러오는 중입니다.</p>;
  }
  if (state.status === "error") {
    return (
      <EntityLoadError
        kind={state.kind}
        onRetry={retry}
        forbiddenMessage="홈 정보에 접근할 권한이 없습니다."
        notFoundMessage="홈 정보를 찾을 수 없습니다."
        backHref="/login"
        backLabel="로그인하러 가기"
      />
    );
  }

  const { summary } = state;

  return (
    <section>
      <div className="mb-10 grid gap-5 sm:grid-cols-3">
        <Link
          href="/coordinations"
          className="rounded-2xl border border-[#dfe3ec] p-6 transition-colors hover:border-[#3937b8]"
        >
          <p className="mb-6 font-semibold">오늘 임장 목록</p>
          <p className="text-4xl font-bold text-[#3937b8]">{summary.todayVisitCount}</p>
        </Link>
        <Link
          href="/coordinations"
          className="rounded-2xl border border-[#dfe3ec] p-6 transition-colors hover:border-[#3937b8]"
        >
          <p className="mb-6 font-semibold">임장 조율 중</p>
          <p className="text-4xl font-bold text-[#3937b8]">{summary.inProgressCoordinationCount}</p>
        </Link>
        <div className="rounded-2xl border border-[#dfe3ec] p-6 text-slate-400">
          <p className="mb-6 font-semibold">계약 만기 D-90</p>
          <p className="text-4xl font-bold">{summary.contractExpiringD90Count}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="rounded-2xl border border-[#dfe3ec] p-6 text-slate-400">
          <p className="mb-6 font-semibold text-[#182033]">오늘 업무 리스트</p>
          <p className="text-sm">준비 중인 기능입니다.</p>
        </div>
        <div className="rounded-2xl border border-[#dfe3ec] p-6">
          <p className="mb-6 font-semibold">임장 조율 현황</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STATUS_WIDGET_ORDER.map((key) => {
              const status = STATUS_WIDGET_KEY_TO_STATUS[key];
              return (
                <div
                  key={key}
                  className={`rounded-lg px-4 py-3 text-center ${coordinationStatusBadgeClassNames[status]}`}
                >
                  <p className="mb-1 text-xs font-semibold">{coordinationStatusLabels[status]}</p>
                  <p className="text-lg font-bold">{summary.coordinationStatusCounts[key]}건</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#dfe3ec] p-6 text-slate-400">
        <p className="mb-6 font-semibold text-[#182033]">캘린더</p>
        <p className="text-sm">준비 중인 기능입니다.</p>
      </div>
    </section>
  );
}
