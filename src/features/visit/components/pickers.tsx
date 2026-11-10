"use client";

import { useState } from "react";
import { useCustomerList } from "@/features/customer/hooks/customer-queries";
import { usePropertyList } from "@/features/property/hooks/property-queries";
import { Badge } from "@/shared/components/ui/badge";
import { SearchField } from "@/shared/components/ui/search-field";
import { useReceivedGrants } from "../hooks/visit-queries";

export type CandidateChoice = { propertyId: number; name: string; officeName?: string };

function ListState({
  isPending,
  isError,
  isEmpty,
  emptyText,
  onRetry,
}: {
  isPending: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyText: string;
  onRetry: () => void;
}) {
  if (isPending) return <p className="text-caption text-ink-2">목록을 불러오는 중입니다.</p>;
  if (isError)
    return (
      <p role="alert" className="text-caption text-danger">
        목록을 불러오지 못했습니다.{" "}
        <button type="button" className="font-semibold underline" onClick={onRetry}>
          다시 시도
        </button>
      </p>
    );
  if (isEmpty) return <p className="text-caption text-ink-2">{emptyText}</p>;
  return null;
}

export function CustomerPicker({
  value,
  onChange,
  error,
}: {
  value: { customerId: number; name: string } | null;
  onChange: (customer: { customerId: number; name: string }) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const query = useCustomerList({
    keyword: keyword.trim() === "" ? undefined : keyword.trim(),
    page: 0,
    size: 25,
  });
  const items = query.data?.items ?? [];
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-caption font-semibold text-ink">고객 선택</legend>
      <SearchField
        label="고객 검색"
        placeholder="고객 이름이나 연락처로 검색하세요."
        value={draft}
        onValueChange={setDraft}
        onSearch={() => setKeyword(draft)}
      />
      <ListState
        isPending={query.isPending}
        isError={query.isError}
        isEmpty={items.length === 0}
        emptyText="검색된 고객이 없습니다."
        onRetry={() => void query.refetch()}
      />
      <ul className="flex max-h-56 flex-col gap-1 overflow-auto">
        {items.map((item) => (
          <li key={item.customerId}>
            <label className="flex items-center gap-3 rounded-control px-3 py-2 text-body text-ink hover:bg-surface">
              <input
                type="radio"
                name="visit-customer"
                checked={value?.customerId === item.customerId}
                onChange={() => onChange({ customerId: item.customerId, name: item.name })}
                className="h-5 w-5 accent-primary"
              />
              <span className="font-semibold">{item.name}</span>
              <span className="text-caption text-ink-2">{item.phone ?? "-"}</span>
            </label>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function CandidatePicker({
  selected,
  onToggle,
  max,
  excludedIds = [],
  error,
}: {
  selected: CandidateChoice[];
  onToggle: (choice: CandidateChoice) => void;
  max: number;
  excludedIds?: number[];
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const own = usePropertyList({
    keyword: keyword.trim() === "" ? undefined : keyword.trim(),
    registrationStage: "ACTIVE",
    page: 0,
    size: 50,
  });
  const grants = useReceivedGrants(keyword.trim());
  const isFull = selected.length >= max;

  function row(choice: CandidateChoice, sub: string) {
    const checked = selected.some((item) => item.propertyId === choice.propertyId);
    const isAdded = excludedIds.includes(choice.propertyId);
    return (
      <li key={`${choice.officeName ?? "own"}-${choice.propertyId}`}>
        <label className="flex flex-wrap items-center gap-3 rounded-control px-3 py-2 text-body text-ink hover:bg-surface">
          <input
            type="checkbox"
            aria-label={`${choice.name} 선택`}
            checked={checked || isAdded}
            disabled={isAdded || (!checked && isFull)}
            onChange={() => onToggle(choice)}
            className="h-5 w-5 accent-primary"
          />
          <span className="font-semibold">{choice.name}</span>
          {choice.officeName ? <Badge tone="teal">{choice.officeName}</Badge> : null}
          {isAdded ? <span className="text-caption text-ink-2">이미 담김</span> : null}
          <span className="text-caption text-ink-2">{sub}</span>
        </label>
      </li>
    );
  }

  const ownItems = own.data?.items ?? [];
  const grantItems = grants.data?.items ?? [];
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-caption font-semibold text-ink">
        후보 매물 선택 ({selected.length}/{max})
      </legend>
      <p className="text-caption text-ink-2">
        자기 사무소 매물과 허용받은 매물을 합쳐 {max}개까지 고를 수 있습니다. 신청 권한이 없는
        매물은 고를 수 없습니다.
      </p>
      <SearchField
        label="매물 검색"
        placeholder="매물 이름이나 주소로 검색하세요."
        value={draft}
        onValueChange={setDraft}
        onSearch={() => setKeyword(draft)}
      />
      <h2 className="text-caption font-semibold text-ink-2">우리 사무소 매물</h2>
      <ListState
        isPending={own.isPending}
        isError={own.isError}
        isEmpty={ownItems.length === 0}
        emptyText="고를 수 있는 매물이 없습니다."
        onRetry={() => void own.refetch()}
      />
      <ul className="flex max-h-56 flex-col gap-1 overflow-auto">
        {ownItems.map((item) =>
          row({ propertyId: item.propertyId, name: item.name }, item.address ?? ""),
        )}
      </ul>
      <h2 className="text-caption font-semibold text-ink-2">허용받은 매물</h2>
      <ListState
        isPending={grants.isPending}
        isError={grants.isError}
        isEmpty={grantItems.length === 0}
        emptyText="허용받은 매물이 없습니다."
        onRetry={() => void grants.refetch()}
      />
      <ul className="flex max-h-56 flex-col gap-1 overflow-auto">
        {grantItems.map((item) =>
          row(
            {
              propertyId: item.propertyId,
              name: item.propertyName,
              officeName: item.ownerOfficeName,
            },
            item.propertyAddress,
          ),
        )}
      </ul>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
