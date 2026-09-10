"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { getProperties } from "../api/property.api";
import { dealTypeLabels } from "../model/property";
import type { PropertySummary } from "../schemas/property.schema";

export function PropertyList() {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"unauthenticated" | "unknown" | null>(null);

  async function loadProperties() {
    setIsLoading(true);
    setError(null);
    try {
      setProperties(await getProperties());
    } catch (caught: unknown) {
      setError(caught instanceof ApiError && caught.status === 401 ? "unauthenticated" : "unknown");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    getProperties()
      .then(setProperties)
      .catch((caught: unknown) =>
        setError(
          caught instanceof ApiError && caught.status === 401 ? "unauthenticated" : "unknown",
        ),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const visibleProperties = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("ko");
    if (!keyword) return properties;
    return properties.filter((property) =>
      [property.propertyName, property.address, property.addressDetail]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLocaleLowerCase("ko").includes(keyword)),
    );
  }, [properties, query]);

  return (
    <section>
      <div className="mb-9 flex flex-wrap items-end gap-4">
        <h1 className="text-3xl font-bold">매물 관리</h1>
        <p className="pb-1 text-sm text-slate-500">등록된 매물을 관리할 수 있습니다.</p>
      </div>
      <div className="mb-9 flex flex-col gap-4 md:flex-row">
        <Link
          href="/properties/new"
          className="inline-flex h-14 items-center justify-center rounded-lg bg-[#3937b8] px-6 font-semibold text-white transition-opacity hover:opacity-90"
        >
          ＋ 매물 등록
        </Link>
        <label className="flex h-14 flex-1 items-center rounded-lg border border-[#dfe3ec] bg-[#f8f9fd] px-5 transition-colors hover:border-[#3937b8]">
          <span className="sr-only">매물 검색</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="매물의 주소나 이름을 검색하세요."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <span className="rounded-md bg-[#3937b8] px-5 py-2 text-sm font-semibold text-white">
            검색
          </span>
        </label>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#dfe3ec] bg-[#f8f9fd]">
        <div className="hidden grid-cols-[1fr_2fr_140px_150px] gap-5 border-b border-indigo-200 px-8 py-5 text-sm font-bold md:grid">
          <span>매물명</span>
          <span>주소</span>
          <span>거래 유형</span>
          <span className="sr-only">작업</span>
        </div>
        {isLoading ? (
          <p className="px-8 py-16 text-center text-slate-500">매물 목록을 불러오는 중입니다.</p>
        ) : null}
        {error ? (
          <div className="px-8 py-16 text-center">
            <p role="alert" className="mb-4 text-red-600">
              {error === "unauthenticated"
                ? "로그인이 필요합니다."
                : "매물 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."}
            </p>
            {error === "unauthenticated" ? (
              <Link href="/login" className="font-semibold text-[#3937b8] hover:underline">
                로그인하러 가기
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void loadProperties()}
                className="font-semibold text-[#3937b8] hover:underline"
              >
                다시 시도
              </button>
            )}
          </div>
        ) : null}
        {!isLoading && !error && visibleProperties.length === 0 ? (
          <p className="px-8 py-16 text-center text-slate-500">
            {query ? "검색 결과가 없습니다." : "등록된 매물이 없습니다."}
          </p>
        ) : null}
        {!isLoading && !error
          ? visibleProperties.map((property) => (
              <article
                key={property.propertyId}
                className="grid gap-3 border-b border-indigo-100 px-8 py-5 last:border-b-0 md:grid-cols-[1fr_2fr_140px_150px] md:items-center md:gap-5"
              >
                <Link
                  href={`/properties/${property.propertyId}`}
                  className="font-bold hover:text-[#3937b8]"
                >
                  {property.propertyName ?? "이름 없는 매물"}
                </Link>
                <p className="text-sm">
                  {property.address}
                  {property.addressDetail ? ` ${property.addressDetail}` : ""}
                </p>
                <span className="text-sm">{dealTypeLabels[property.dealType]}</span>
                <Link
                  href={`/coordinations/new?propertyId=${property.propertyId}`}
                  className="rounded-md border border-[#3937b8] px-3 py-2 text-center text-sm font-semibold text-[#3937b8] transition-colors hover:bg-[#3937b8] hover:text-white"
                >
                  임장 조율 시작
                </Link>
              </article>
            ))
          : null}
      </div>
    </section>
  );
}
