"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listCustomers } from "@/features/customer/api/customer.api";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/components/ui/button";
import { Chip } from "@/shared/components/ui/chip";
import {
  FieldLabel,
  OFFICE_FIELD_GAP_CLASS,
  OFFICE_FIELD_LABEL_CLASS,
} from "@/shared/components/ui/field-label";
import { TextField } from "@/shared/components/ui/text-field";
import { TEXT_LIMITS } from "@/shared/lib/format";
import { createCategory } from "../api/property.api";
import { propertyKeys } from "../hooks/property-queries";
import { formatWonCompact } from "../model/format";
import type { PropertyFormErrors, PropertyFormField, PropertyFormValues } from "../model/form";
import { DEAL_TYPES, DEAL_TYPE_LABEL } from "../model/labels";
import { describePropertyError } from "../model/messages";

export type PartyPick = { customerId: number; name: string };

const NAME_SEARCH_SIZE = 5;

function amountHint(value: string): string | undefined {
  return /^\d+$/.test(value.trim()) ? formatWonCompact(Number(value)) : undefined;
}

type DealFieldsProps = {
  values: PropertyFormValues;
  errors: PropertyFormErrors;
  disabled: boolean;
  onChange: <K extends PropertyFormField>(key: K, value: PropertyFormValues[K]) => void;
};

/** 가격 입력. 월세는 보증금과 월세를, 전세와 매매는 하나의 금액을 받는다. */
export function DealPriceFields({ values, errors, disabled, onChange }: DealFieldsProps) {
  const priceLabel =
    values.dealType === "SALE"
      ? "가격 (매매가, 원)"
      : values.dealType === "JEONSE"
        ? "가격 (전세 보증금, 원)"
        : "가격 (보증금, 원)";
  const priceKey = values.dealType === "SALE" ? "salePrice" : "depositAmount";
  return (
    <div className="flex min-w-0 flex-col gap-[30px]">
      <TextField
        label={priceLabel}
        kind="number"
        placeholder="매물이 거래되는 가격을 입력해 주세요."
        disabled={disabled}
        value={values[priceKey]}
        hint={amountHint(values[priceKey])}
        onValueChange={(value) => onChange(priceKey, value)}
        error={errors[priceKey]}
      />
      {values.dealType === "MONTHLY" ? (
        <TextField
          label="가격 (월세, 원)"
          kind="number"
          placeholder="월세 금액을 입력해 주세요."
          disabled={disabled}
          value={values.monthlyRentAmount}
          hint={amountHint(values.monthlyRentAmount)}
          onValueChange={(value) => onChange("monthlyRentAmount", value)}
          error={errors.monthlyRentAmount}
        />
      ) : null}
    </div>
  );
}

/** 거래 유형 선택 칩. 월세, 전세, 매매 중 하나를 고른다. */
export function DealTypeChips({
  values,
  disabled,
  lockedHint,
  onChange,
}: Omit<DealFieldsProps, "errors"> & {
  /** 진행 중인 제안이 있어 여기서 바꿀 수 없을 때 보여 주는 안내. */
  lockedHint?: string;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2 lg:col-span-2">
      <FieldLabel as="legend" required>
        거래 유형
      </FieldLabel>
      <div className="flex flex-wrap gap-4">
        {DEAL_TYPES.map((dealType) => (
          <Chip
            key={dealType}
            size="lg"
            isSelected={values.dealType === dealType}
            disabled={disabled}
            onClick={() => onChange("dealType", dealType)}
          >
            {DEAL_TYPE_LABEL[dealType]}
          </Chip>
        ))}
      </div>
      {lockedHint ? <p className="text-caption text-ink-2">{lockedHint}</p> : null}
    </fieldset>
  );
}

/** 소유자·점유자 이름으로 등록된 고객을 찾아 연결한다. 새 개인정보는 여기서 만들지 않는다. */
export function CustomerNamePicker({
  label,
  placeholder,
  selected,
  existingNames,
  disabled,
  onSelect,
}: {
  label: string;
  placeholder: string;
  selected: PartyPick | null;
  existingNames: readonly string[];
  disabled: boolean;
  onSelect: (pick: PartyPick | null) => void;
}) {
  const [text, setText] = useState("");
  const [keyword, setKeyword] = useState("");
  const search = useQuery({
    queryKey: ["property", "party-search", keyword],
    queryFn: () => listCustomers({ keyword, page: 0, size: NAME_SEARCH_SIZE }),
    enabled: keyword !== "",
  });
  const hint =
    existingNames.length > 0 ? `현재 연결된 고객: ${existingNames.join(", ")}` : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <TextField
        label={`${label} (선택)`}
        placeholder={placeholder}
        disabled={disabled}
        value={selected ? selected.name : text}
        readOnly={selected !== null}
        maxLength={TEXT_LIMITS.title}
        hint={hint}
        actionLabel={selected ? "변경" : "검색"}
        isActionDisabled={disabled || (selected === null && text.trim() === "")}
        onValueChange={(value) => {
          setText(value);
          setKeyword("");
        }}
        onAction={() => {
          if (selected) {
            onSelect(null);
            setText("");
            setKeyword("");
            return;
          }
          setKeyword(text.trim());
        }}
      />
      {selected === null && keyword !== "" ? (
        <div className="rounded-control border border-line bg-white p-3 text-caption text-ink-2">
          {search.isPending ? (
            <p role="status">고객을 찾는 중입니다.</p>
          ) : search.isError ? (
            <p role="alert" className="text-danger">
              {describePropertyError(search.error, "고객을 찾지 못했습니다.")}
            </p>
          ) : search.data.items.length === 0 ? (
            <p>
              등록된 고객 중에 일치하는 이름이 없습니다. 고객 관리에서 먼저 등록한 뒤 연결해 주세요.
            </p>
          ) : (
            <ul className="flex flex-col gap-1" aria-label={`${label} 검색 결과`}>
              {search.data.items.map((item) => (
                <li key={item.customerId}>
                  <button
                    type="button"
                    className="w-full rounded-small px-2 py-1.5 text-left text-body text-ink clickable-control"
                    onClick={() => {
                      onSelect({ customerId: item.customerId, name: item.name });
                      setKeyword("");
                    }}
                  >
                    {item.name}
                    {item.phone ? (
                      <span className="ml-2 text-caption text-muted">
                        끝자리 {item.phone.replace(/\D/g, "").slice(-4)}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** "직접 입력해서 추가하기" 버튼과 입력 줄. 새 카테고리를 만들고 바로 선택한다. */
export function CategoryQuickAdd({
  disabled,
  onCreated,
}: {
  disabled: boolean;
  onCreated: (categoryId: number) => void;
}) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: () => createCategory({ name: name.trim() }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: propertyKeys.categories });
      onCreated(created.categoryId);
      setName("");
      setError(undefined);
      setIsOpen(false);
    },
    onError: (caught) =>
      setError(describePropertyError(caught, "카테고리를 만들지 못했습니다. 다시 시도해 주세요.")),
  });

  function submit() {
    const trimmed = name.trim();
    if (trimmed === "") return setError("카테고리 이름을 입력해 주세요.");
    if (Array.from(trimmed).length > TEXT_LIMITS.title) {
      return setError(`카테고리 이름은 ${TEXT_LIMITS.title}자 이하로 입력해 주세요.`);
    }
    setError(undefined);
    mutation.mutate();
  }

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        className="h-[42px] min-w-0 shrink-0 px-4 text-body font-medium text-ink-2"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        직접 입력해서 추가하기
      </Button>
    );
  }
  return (
    <div className={cn("flex w-full min-w-0 flex-col", OFFICE_FIELD_GAP_CLASS)}>
      <p className={OFFICE_FIELD_LABEL_CLASS}>새 카테고리 이름</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label="새 카테고리 이름"
          value={name}
          maxLength={TEXT_LIMITS.title}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setName(event.target.value);
            setError(undefined);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            submit();
          }}
          className="h-[42px] min-w-[200px] flex-1 rounded-control border border-control bg-white px-4 text-body text-ink"
        />
        <Button size="sm" isLoading={mutation.isPending} onClick={submit}>
          추가
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={mutation.isPending}
          onClick={() => {
            setIsOpen(false);
            setName("");
            setError(undefined);
          }}
        >
          취소
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
