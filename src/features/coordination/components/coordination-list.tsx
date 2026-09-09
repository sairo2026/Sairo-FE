"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { getCoordinationList } from "../api/coordination.api";
import {
  coordinationStatusBadgeClassNames,
  coordinationStatusLabels,
  formatShortSchedule,
} from "../model/coordination";
import {
  coordinationStatuses,
  type CoordinationListItem,
  type CoordinationStatus,
  type CoordinationStatusCounts,
} from "../schemas/coordination.schema";
import { CoordinationStatusBadge } from "./coordination-status-badge";

const STATUS_TILE_ORDER: (keyof CoordinationStatusCounts)[] = [
  "tenantChecking",
  "buyerDeliveryRequired",
  "buyerChecking",
  "finalConfirmationRequired",
  "scheduleConfirmed",
  "visitCompleted",
];

const STATUS_TILE_LABELS: Record<keyof CoordinationStatusCounts, CoordinationStatus> = {
  tenantChecking: "TENANT_CHECKING",
  buyerDeliveryRequired: "BUYER_DELIVERY_REQUIRED",
  buyerChecking: "BUYER_CHECKING",
  finalConfirmationRequired: "FINAL_CONFIRMATION_REQUIRED",
  scheduleConfirmed: "SCHEDULE_CONFIRMED",
  visitCompleted: "VISIT_COMPLETED",
};

function toCoordinationStatus(value: string | null): CoordinationStatus | null {
  return coordinationStatuses.find((status) => status === value) ?? null;
}

export function CoordinationList() {
  const searchParams = useSearchParams();
  const [coordinations, setCoordinations] = useState<CoordinationListItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<CoordinationStatusCounts | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CoordinationStatus | null>(() =>
    toCoordinationStatus(searchParams.get("status")),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"unauthenticated" | "unknown" | null>(null);

  async function loadList() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCoordinationList();
      setCoordinations(result.coordinations);
      setStatusCounts(result.statusCounts);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError && caught.status === 401 ? "unauthenticated" : "unknown");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    getCoordinationList()
      .then((result) => {
        setCoordinations(result.coordinations);
        setStatusCounts(result.statusCounts);
      })
      .catch((caught: unknown) =>
        setError(
          caught instanceof ApiError && caught.status === 401 ? "unauthenticated" : "unknown",
        ),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const visibleCoordinations = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("ko");
    return coordinations.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (!keyword) return true;
      return [item.propertyAddress, item.tenantName, item.tenantPhone].some((value) =>
        value.toLocaleLowerCase("ko").includes(keyword),
      );
    });
  }, [coordinations, query, statusFilter]);

  return (
    <section>
      <div className="mb-9 flex flex-wrap items-end gap-4">
        <h1 className="text-3xl font-bold">임장 조율</h1>
        <p className="pb-1 text-sm text-slate-500">
          고객과 임장 일정을 편리하게 조율할 수 있습니다.
        </p>
      </div>
      <div className="mb-9 flex flex-col gap-4 md:flex-row">
        <Link
          href="/properties"
          className="inline-flex h-14 items-center justify-center rounded-lg bg-[#3937b8] px-6 font-semibold text-white"
        >
          ＋ 조율 생성
        </Link>
        <label className="flex h-14 flex-1 items-center rounded-lg border border-[#dfe3ec] bg-[#f8f9fd] px-5">
          <span className="sr-only">임장 조율 검색</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="매물의 주소나 고객 이름을 검색하세요."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <span className="rounded-md bg-[#3937b8] px-5 py-2 text-sm font-semibold text-white">
            검색
          </span>
        </label>
      </div>
      {statusCounts ? (
        <div className="mb-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {STATUS_TILE_ORDER.map((key) => {
            const status = STATUS_TILE_LABELS[key];
            const isActive = statusFilter === status;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(isActive ? null : status)}
                aria-pressed={isActive}
                className={`rounded-xl px-4 py-5 text-center transition-opacity hover:opacity-80 ${coordinationStatusBadgeClassNames[status]} ${isActive ? "ring-2 ring-[#3937b8] ring-offset-2" : ""}`}
              >
                <p className="mb-2 text-sm font-semibold">{coordinationStatusLabels[status]}</p>
                <p className="text-xl font-bold">{statusCounts[key]}건</p>
              </button>
            );
          })}
        </div>
      ) : null}
      {statusFilter ? (
        <p className="mb-6 -mt-5 text-sm text-slate-500">
          {coordinationStatusLabels[statusFilter]} 상태만 보고 있습니다.{" "}
          <button
            type="button"
            onClick={() => setStatusFilter(null)}
            className="font-semibold text-[#3937b8]"
          >
            필터 해제
          </button>
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-[#dfe3ec] bg-[#f8f9fd]">
        <div className="hidden grid-cols-[1.4fr_1.6fr_1fr_1fr] gap-5 border-b border-indigo-200 px-8 py-5 text-sm font-bold md:grid">
          <span>고객 / 연락처</span>
          <span>주소</span>
          <span>임장 일정</span>
          <span>조율 현황</span>
        </div>
        {isLoading ? (
          <p className="px-8 py-16 text-center text-slate-500">
            임장 조율 목록을 불러오는 중입니다.
          </p>
        ) : null}
        {error ? (
          <div className="px-8 py-16 text-center">
            <p role="alert" className="mb-4 text-red-600">
              {error === "unauthenticated"
                ? "로그인이 필요합니다."
                : "임장 조율 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."}
            </p>
            {error === "unauthenticated" ? (
              <Link href="/login" className="font-semibold text-[#3937b8]">
                로그인하러 가기
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void loadList()}
                className="font-semibold text-[#3937b8]"
              >
                다시 시도
              </button>
            )}
          </div>
        ) : null}
        {!isLoading && !error && visibleCoordinations.length === 0 ? (
          <p className="px-8 py-16 text-center text-slate-500">
            {query ? "검색 결과가 없습니다." : "진행 중인 임장 조율이 없습니다."}
          </p>
        ) : null}
        {!isLoading && !error
          ? visibleCoordinations.map((item) => (
              <Link
                key={item.coordinationId}
                href={`/coordinations/${item.coordinationId}`}
                className="grid gap-3 border-b border-indigo-100 px-8 py-5 last:border-b-0 hover:bg-white md:grid-cols-[1.4fr_1.6fr_1fr_1fr] md:items-center md:gap-5"
              >
                <span className="font-bold">
                  {item.tenantName} / {item.tenantPhone}
                </span>
                <span className="text-sm">{item.propertyAddress}</span>
                <span className="text-sm font-semibold">
                  {item.status === "VISIT_COMPLETED"
                    ? "임장 완료"
                    : item.visitScheduledAt
                      ? formatShortSchedule(item.visitScheduledAt)
                      : "진행 상황 보기"}
                </span>
                <CoordinationStatusBadge status={item.status} />
              </Link>
            ))
          : null}
      </div>
    </section>
  );
}
