"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { Badge, DDayTag } from "@/shared/components/ui/badge";
import { CreateLink } from "@/shared/components/ui/create-link";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SearchField } from "@/shared/components/ui/search-field";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { Toggle } from "@/shared/components/ui/select-field";
import { useAssignableMembers } from "@/shared/session/assignable-members";
import type { PropertyListResponse } from "@/lib/api/contracts/property.schema";
import type { PropertyListParams } from "../api/property.api";
import { usePropertyCategories, usePropertyList } from "../hooks/property-queries";
import { daysUntil, joinNames, summarizeOffers } from "../model/format";
import {
  AREA_TYPES,
  AREA_TYPE_LABEL,
  DEAL_TYPES,
  DEAL_TYPE_LABEL,
  STAGE_LABEL,
  STAGE_TONE,
  isDealType,
  labelOf,
  toneOf,
} from "../model/labels";
import { describePropertyError } from "../model/messages";

type Row = PropertyListResponse["items"][number];

type Filters = {
  keyword: string;
  dealType: string;
  categoryId: string;
  registrationStage: string;
  managingMembershipId: string;
  areaType: string;
  areaMin: string;
  areaMax: string;
  priceMin: string;
  priceMax: string;
  archived: boolean;
};

const EMPTY_FILTERS: Filters = {
  keyword: "",
  dealType: "",
  categoryId: "",
  registrationStage: "",
  managingMembershipId: "",
  areaType: "",
  areaMin: "",
  areaMax: "",
  priceMin: "",
  priceMax: "",
  archived: false,
};

const MAN_WON = 10_000;

const PRICE_BASIS_LABEL = { SALE: "매매가", JEONSE: "보증금", MONTHLY: "월세" } as const;

function priceBasisLabel(dealType: string): string {
  return isDealType(dealType) ? PRICE_BASIS_LABEL[dealType] : "가격";
}

function priceHint(dealType: string): string {
  if (dealType === "") return "가격은 거래유형을 먼저 선택하면 입력할 수 있습니다.";
  if (dealType === "MONTHLY") return "월세 매물은 보증금이 아닌 월세 금액으로 찾습니다.";
  return `${priceBasisLabel(dealType)} 기준으로 찾습니다.`;
}

function optionalNumber(value: string, multiplier = 1): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "" || Number.isNaN(Number(trimmed))) return undefined;
  return Number(trimmed) * multiplier;
}

function toParams(filters: Filters, page: number, size: number): PropertyListParams {
  const hasArea = filters.areaMin.trim() !== "" || filters.areaMax.trim() !== "";
  return {
    keyword: filters.keyword.trim() === "" ? undefined : filters.keyword.trim(),
    dealType: filters.dealType || undefined,
    categoryId: optionalNumber(filters.categoryId),
    registrationStage: filters.registrationStage || undefined,
    managingMembershipId: optionalNumber(filters.managingMembershipId),
    areaType: hasArea ? filters.areaType || undefined : undefined,
    areaMin: optionalNumber(filters.areaMin),
    areaMax: optionalNumber(filters.areaMax),
    priceMin: filters.dealType ? optionalNumber(filters.priceMin, MAN_WON) : undefined,
    priceMax: filters.dealType ? optionalNumber(filters.priceMax, MAN_WON) : undefined,
    archived: filters.archived ? true : undefined,
    page: page - 1,
    size,
  };
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 clickable-control"
    >
      {children}
    </Link>
  );
}

export function PropertyListScreen() {
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const [filterError, setFilterError] = useState<string>();
  const categories = usePropertyCategories();
  const members = useAssignableMembers();
  const query = usePropertyList(toParams(applied, page, size));

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function applyNow(next: Filters) {
    setFilterError(undefined);
    setApplied(next);
    setPage(1);
  }

  function search() {
    const hasArea = draft.areaMin.trim() !== "" || draft.areaMax.trim() !== "";
    if (hasArea && draft.areaType === "") {
      setFilterError("면적 범위를 쓰려면 면적 종류를 먼저 선택해 주세요.");
      return;
    }
    applyNow(draft);
  }

  function changeImmediate<K extends keyof Filters>(
    key: K,
    value: Filters[K],
    extra: Partial<Filters> = {},
  ) {
    const next = { ...draft, ...extra, [key]: value };
    setDraft(next);
    applyNow(next);
  }

  function reset() {
    setDraft(EMPTY_FILTERS);
    applyNow(EMPTY_FILTERS);
  }

  const now = new Date();
  const columns = [
    {
      key: "name",
      header: "매물명",
      widthClass: "w-[156px]",
      render: (row: Row) => (
        <Link
          href={`/properties/${row.propertyId}`}
          className="font-bold text-ink hover:text-primary hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "address",
      header: "주소",
      widthClass: "w-[300px]",
      truncate: true,
      render: (row: Row) =>
        row.address ? `${row.address}${row.addressDetail ? ` ${row.addressDetail}` : ""}` : "-",
    },
    {
      key: "owner",
      header: "소유자",
      widthClass: "w-16",
      render: (row: Row) => joinNames(row.ownerNames),
    },
    {
      key: "occupant",
      header: "현재 점유자",
      widthClass: "w-24",
      render: (row: Row) => joinNames(row.occupantNames),
    },
    {
      key: "offers",
      header: "거래유형·가격",
      widthClass: "w-[150px]",
      render: (row: Row) => {
        const lines = summarizeOffers(row);
        if (lines.length === 0) return <span className="text-ink-3">제안 없음</span>;
        return (
          <ul className="flex flex-col gap-1">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        );
      },
    },
    {
      key: "lease",
      header: "임대 만기",
      widthClass: "w-[120px]",
      render: (row: Row) => (
        <div className="flex flex-col items-start gap-1">
          <DDayTag daysLeft={daysUntil(row.leaseEndDate, now)} />
          {row.leaseEndSource === "REFERENCE" ? (
            <span className="text-caption text-ink-2">참고 만기일</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "stage",
      header: "상태",
      widthClass: "w-[120px]",
      render: (row: Row) => (
        <Badge tone={toneOf(STAGE_TONE, row.registrationStage)}>
          {labelOf(STAGE_LABEL, row.registrationStage)}
        </Badge>
      ),
    },
    { key: "category", header: "카테고리", render: (row: Row) => row.categoryName },
    { key: "manager", header: "담당자", render: (row: Row) => row.managingMemberName ?? "-" },
  ];

  if (query.isError && query.error instanceof ApiError && [403, 429].includes(query.error.status)) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(query.error)}
        traceId={query.error.traceId}
        retryAfterSeconds={query.error.retryAfterSeconds}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="매물 관리" description="등록된 매물을 관리할 수 있습니다." />
      <div className="flex flex-wrap items-center gap-4">
        <CreateLink href="/properties/new">매물 등록</CreateLink>
        <div className="min-w-[260px] max-w-[856px] flex-1">
          <SearchField
            label="매물 검색"
            placeholder="매물명, 주소, 연결 고객명으로 검색하세요."
            value={draft.keyword}
            onValueChange={(value) => update("keyword", value)}
            onSearch={search}
          />
        </div>
        <SecondaryLink href="/properties/categories">카테고리 관리</SecondaryLink>
      </div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <SelectField
          layout="inline"
          label="담당자"
          value={draft.managingMembershipId}
          options={[
            { value: "", label: "전체" },
            ...(members.data ?? []).map((item) => ({
              value: String(item.membershipId),
              label: item.displayName,
            })),
          ]}
          onValueChange={(value) => changeImmediate("managingMembershipId", value)}
        />
        <SelectField
          layout="inline"
          label="등록 단계"
          value={draft.registrationStage}
          options={[
            { value: "", label: "전체" },
            { value: "DRAFT", label: STAGE_LABEL.DRAFT },
            { value: "ACTIVE", label: STAGE_LABEL.ACTIVE },
          ]}
          onValueChange={(value) => changeImmediate("registrationStage", value)}
        />
        <SelectField
          layout="inline"
          label="거래유형"
          value={draft.dealType}
          options={[
            { value: "", label: "전체" },
            ...DEAL_TYPES.map((value) => ({ value, label: DEAL_TYPE_LABEL[value] })),
          ]}
          onValueChange={(value) =>
            changeImmediate("dealType", value, value === "" ? { priceMin: "", priceMax: "" } : {})
          }
        />
        <SelectField
          layout="inline"
          label="카테고리"
          value={draft.categoryId}
          options={[
            { value: "", label: "전체" },
            ...(categories.data?.items ?? []).map((item) => ({
              value: String(item.categoryId),
              label: item.active ? item.name : `${item.name} (비활성)`,
            })),
          ]}
          onValueChange={(value) => changeImmediate("categoryId", value)}
        />
        <div className="flex items-center gap-5 text-body font-semibold text-ink-2">
          <span>보관된 매물만 보기</span>
          <Toggle
            label="보관된 매물만 보기"
            checked={draft.archived}
            onCheckedChange={(value) => changeImmediate("archived", value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 text-caption text-ink-2">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="면적 종류"
            value={draft.areaType}
            options={[
              { value: "", label: "선택 안 함" },
              ...AREA_TYPES.map((value) => ({ value, label: AREA_TYPE_LABEL[value] })),
            ]}
            onValueChange={(value) => update("areaType", value)}
          />
          <TextField
            label="면적 하한(㎡)"
            kind="number"
            value={draft.areaMin}
            onValueChange={(value) => update("areaMin", value)}
          />
          <TextField
            label="면적 상한(㎡)"
            kind="number"
            value={draft.areaMax}
            onValueChange={(value) => update("areaMax", value)}
          />
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label={`${priceBasisLabel(draft.dealType)} 하한(만원)`}
                kind="number"
                disabled={draft.dealType === ""}
                value={draft.priceMin}
                onValueChange={(value) => update("priceMin", value)}
              />
              <TextField
                label={`${priceBasisLabel(draft.dealType)} 상한(만원)`}
                kind="number"
                disabled={draft.dealType === ""}
                value={draft.priceMax}
                onValueChange={(value) => update("priceMax", value)}
              />
            </div>
            <p>{priceHint(draft.dealType)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={search}
            className="h-9 rounded-control bg-primary px-4 text-caption font-semibold text-white hover:bg-primary-hover"
          >
            조건 적용
          </button>
          <button
            type="button"
            onClick={reset}
            className="h-9 rounded-control border border-line bg-white px-4 text-caption text-ink-2 clickable-control"
          >
            초기화
          </button>
        </div>
      </div>
      {filterError ? <FormAlert>{filterError}</FormAlert> : null}
      <DataTable
        caption="매물 목록"
        columns={columns}
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.propertyId)}
        getRowHref={(row) => `/properties/${row.propertyId}`}
        totalCount={query.data?.totalElements ?? 0}
        page={page}
        pageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setSize(next);
          setPage(1);
        }}
        isLoading={query.isPending}
        errorMessage={
          query.isError
            ? describePropertyError(query.error, "매물 목록을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage={
          applied.archived
            ? "보관된 매물이 없습니다."
            : "조건에 맞는 매물이 없습니다. 매물을 등록해 보세요."
        }
      />
    </div>
  );
}
