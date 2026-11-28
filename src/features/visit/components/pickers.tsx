"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { useCustomerList } from "@/features/customer/hooks/customer-queries";
import { usePropertyList } from "@/features/property/hooks/property-queries";
import { FieldLabel } from "@/shared/components/ui/field-label";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-more-hint";
import { SearchField } from "@/shared/components/ui/search-field";
import { Checkbox, Radio } from "@/shared/components/ui/select-field";
import { useReceivedGrants } from "../hooks/visit-queries";

const EMPTY_LINK_CLASS = "font-semibold text-primary clickable-link";

export type CandidateChoice = { propertyId: number; name: string; officeName?: string };

function ListState({
  isPending,
  isError,
  isEmpty,
  emptyText,
  emptyAction,
  onRetry,
}: {
  isPending: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyText: string;
  emptyAction?: ReactNode;
  onRetry: () => void;
}) {
  if (isPending) return <p className="text-caption text-ink-2">목록을 불러오는 중입니다.</p>;
  if (isError)
    return (
      <p role="alert" className="text-caption text-danger">
        목록을 불러오지 못했습니다.{" "}
        <button
          type="button"
          className="font-semibold underline hover:text-primary active:text-primary-pressed"
          onClick={onRetry}
        >
          다시 시도
        </button>
      </p>
    );
  if (isEmpty)
    return (
      <p className="text-caption text-ink-2">
        {emptyText} {emptyAction}
      </p>
    );
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
    <fieldset className="min-w-0 flex flex-col gap-3">
      <FieldLabel as="legend">고객 선택</FieldLabel>
      <SearchField
        label="고객 검색"
        placeholder="고객 이름이나 연락처를 입력해 주세요."
        value={draft}
        onValueChange={setDraft}
        onSearch={() => setKeyword(draft)}
      />
      <ListState
        isPending={query.isPending}
        isError={query.isError}
        isEmpty={items.length === 0}
        emptyText="검색된 고객이 없습니다."
        emptyAction={
          <Link href="/customers/new" className={EMPTY_LINK_CLASS}>
            고객 등록하기
          </Link>
        }
        onRetry={() => void query.refetch()}
      />
      <ScrollArea
        label="고객 목록"
        className="max-h-[224px] rounded-control border border-line p-1"
      >
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.customerId}>
              <Radio
                name="visit-customer"
                checked={value?.customerId === item.customerId}
                onSelect={() => onChange({ customerId: item.customerId, name: item.name })}
                className="w-full rounded-control px-3 hover:bg-primary-soft"
                label={
                  <>
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-caption text-ink-2">{item.phone ?? "-"}</span>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      </ScrollArea>
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
        <Checkbox
          ariaLabel={`${choice.name} 선택`}
          checked={checked || isAdded}
          disabled={isAdded || (!checked && isFull)}
          onCheckedChange={() => onToggle(choice)}
          className="w-full flex-wrap rounded-control px-3 hover:bg-primary-soft"
          label={
            <>
              <span className="font-semibold">{choice.name}</span>
              {choice.officeName ? <Badge tone="teal">{choice.officeName}</Badge> : null}
              {isAdded ? <span className="text-caption text-ink-2">이미 담김</span> : null}
              <span className="text-caption text-ink-2">{sub}</span>
            </>
          }
        />
      </li>
    );
  }

  const ownItems = own.data?.items ?? [];
  const grantItems = grants.data?.items ?? [];
  return (
    <fieldset className="min-w-0 flex flex-col gap-3">
      <FieldLabel as="legend">
        후보 매물 선택 ({selected.length}/{max})
      </FieldLabel>
      <p className="text-caption text-ink-2">
        자기 사무소 매물과 허용받은 매물을 합쳐 {max}개까지 고를 수 있습니다. 활성 등록된 매물만
        선택할 수 있고, 신청 권한이 없는 매물은 고를 수 없습니다.
      </p>
      <SearchField
        label="매물 검색"
        placeholder="매물 이름이나 주소를 입력해 주세요."
        value={draft}
        onValueChange={setDraft}
        onSearch={() => setKeyword(draft)}
      />
      <h2 className="mt-3 text-body font-semibold text-ink">우리 사무소 매물</h2>
      <ListState
        isPending={own.isPending}
        isError={own.isError}
        isEmpty={ownItems.length === 0}
        emptyText="고를 수 있는 매물이 없습니다."
        emptyAction={
          <Link href="/properties/new" className={EMPTY_LINK_CLASS}>
            매물 등록하기
          </Link>
        }
        onRetry={() => void own.refetch()}
      />
      <ScrollArea
        label="우리 사무소 매물 목록"
        className="max-h-[224px] rounded-control border border-line p-1"
      >
        <ul className="flex flex-col gap-1">
          {ownItems.map((item) =>
            row({ propertyId: item.propertyId, name: item.name }, item.address ?? ""),
          )}
        </ul>
      </ScrollArea>
      <h2 className="mt-3 text-body font-semibold text-ink">허용받은 매물</h2>
      <ListState
        isPending={grants.isPending}
        isError={grants.isError}
        isEmpty={grantItems.length === 0}
        emptyText="허용받은 매물이 없습니다."
        onRetry={() => void grants.refetch()}
      />
      <ScrollArea
        label="허용받은 매물 목록"
        className="max-h-[224px] rounded-control border border-line p-1"
      >
        <ul className="flex flex-col gap-1">
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
      </ScrollArea>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
