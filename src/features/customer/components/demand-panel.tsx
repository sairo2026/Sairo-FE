"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { CustomerDetail } from "../api/wire";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { DetailList } from "@/shared/components/feedback/page-parts";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatCount, formatSeoulDate } from "@/shared/lib/format";
import { createDemandCondition, updateDemandCondition } from "../api/customer.api";
import {
  customerKeys,
  useCandidateProperties,
  usePropertyCategoryOptions,
} from "../hooks/customer-queries";
import { DEAL_TYPES, DEAL_TYPE_LABEL, isDealType } from "../model/labels";
import type { DealType } from "../model/labels";
import { describeCustomerError, isApiCode } from "../model/messages";

type Condition = CustomerDetail["demandConditions"][number];

const MAN_WON = 10_000;

type DemandValues = {
  dealType: string;
  categoryId: string;
  priceMin: string;
  priceMax: string;
  depositMin: string;
  depositMax: string;
  rentMin: string;
  rentMax: string;
  areaMin: string;
  areaMax: string;
  moveInDate: string;
  regions: string;
};

type DemandErrors = Partial<Record<keyof DemandValues, string>>;

function won(value: number | null): string {
  return value === null ? "" : String(value / MAN_WON);
}

function valuesFromCondition(condition: Condition | null): DemandValues {
  return {
    dealType: condition?.dealType ?? "MONTHLY",
    categoryId:
      condition?.categoryId === null || condition?.categoryId === undefined
        ? ""
        : String(condition.categoryId),
    priceMin: won(condition?.priceMin ?? null),
    priceMax: won(condition?.priceMax ?? null),
    depositMin: won(condition?.depositMin ?? null),
    depositMax: won(condition?.depositMax ?? null),
    rentMin: won(condition?.rentMin ?? null),
    rentMax: won(condition?.rentMax ?? null),
    areaMin:
      condition?.areaMin === null || condition?.areaMin === undefined
        ? ""
        : String(condition.areaMin),
    areaMax:
      condition?.areaMax === null || condition?.areaMax === undefined
        ? ""
        : String(condition.areaMax),
    moveInDate: condition?.moveInDate ?? "",
    regions: condition?.regions.map((item) => item.regionName).join(", ") ?? "",
  };
}

const RANGE_FIELDS: Array<{
  low: keyof DemandValues;
  high: keyof DemandValues;
  label: string;
  unit: string;
  appliesTo: readonly DealType[];
}> = [
  { low: "priceMin", high: "priceMax", label: "매매가", unit: "만원", appliesTo: ["SALE"] },
  {
    low: "depositMin",
    high: "depositMax",
    label: "보증금",
    unit: "만원",
    appliesTo: ["JEONSE", "MONTHLY"],
  },
  { low: "rentMin", high: "rentMax", label: "월세", unit: "만원", appliesTo: ["MONTHLY"] },
  { low: "areaMin", high: "areaMax", label: "면적", unit: "㎡", appliesTo: DEAL_TYPES },
];

function validateDemand(values: DemandValues): DemandErrors {
  const errors: DemandErrors = {};
  const dealType = isDealType(values.dealType) ? values.dealType : "MONTHLY";
  for (const range of RANGE_FIELDS) {
    if (!range.appliesTo.includes(dealType)) continue;
    for (const key of [range.low, range.high]) {
      const raw = values[key].trim();
      if (raw !== "" && !/^\d+(\.\d+)?$/.test(raw)) {
        errors[key] = `${range.label}은 0 이상의 숫자로 입력해 주세요.`;
      }
    }
    const low = values[range.low].trim();
    const high = values[range.high].trim();
    if (!errors[range.low] && !errors[range.high] && low !== "" && high !== "") {
      if (Number(low) > Number(high)) {
        errors[range.high] = `${range.label} 하한이 상한보다 클 수 없습니다.`;
      }
    }
  }
  return errors;
}

function toMoney(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Math.round(Number(trimmed) * MAN_WON);
}

function toNumber(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function toRequest(values: DemandValues) {
  const dealType = isDealType(values.dealType) ? values.dealType : "MONTHLY";
  const regions = values.regions
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  return {
    dealType,
    categoryId: values.categoryId === "" ? null : Number(values.categoryId),
    priceMin: dealType === "SALE" ? toMoney(values.priceMin) : null,
    priceMax: dealType === "SALE" ? toMoney(values.priceMax) : null,
    depositMin: dealType === "SALE" ? null : toMoney(values.depositMin),
    depositMax: dealType === "SALE" ? null : toMoney(values.depositMax),
    rentMin: dealType === "MONTHLY" ? toMoney(values.rentMin) : null,
    rentMax: dealType === "MONTHLY" ? toMoney(values.rentMax) : null,
    areaMin: toNumber(values.areaMin),
    areaMax: toNumber(values.areaMax),
    moveInDate: values.moveInDate === "" ? null : values.moveInDate,
    regions,
  };
}

function formatRange(low: number | null, high: number | null, unit: "원" | "㎡"): string {
  if (low === null && high === null) return "-";
  const format = (value: number) =>
    unit === "원" ? `${formatCount(value / MAN_WON)}만원` : `${value}㎡`;
  return `${low === null ? "하한 없음" : format(low)} ~ ${high === null ? "상한 없음" : format(high)}`;
}

function DemandForm({
  customer,
  condition,
  onDone,
  onCancel,
}: {
  customer: CustomerDetail;
  condition: Condition | null;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const categories = usePropertyCategoryOptions();
  const [values, setValues] = useState<DemandValues>(() => valuesFromCondition(condition));
  const [errors, setErrors] = useState<DemandErrors>({});
  const [formError, setFormError] = useState<string>();
  const dealType = isDealType(values.dealType) ? values.dealType : "MONTHLY";

  function set(key: keyof DemandValues, value: string) {
    setValues((existing) => ({ ...existing, [key]: value }));
    setErrors((existing) => ({ ...existing, [key]: undefined }));
  }

  const mutation = useMutation({
    mutationFn: () =>
      condition
        ? updateDemandCondition(condition.conditionId, toRequest(values), condition.version)
        : createDemandCondition(customer.customerId, toRequest(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      onDone(condition ? "희망조건을 수정했습니다." : "희망조건을 등록했습니다.");
    },
    onError: async (caught) => {
      if (isApiCode(caught, "VERSION_CONFLICT")) {
        await queryClient.invalidateQueries({ queryKey: customerKeys.detail(customer.customerId) });
      }
      setFormError(describeCustomerError(caught, "희망조건을 저장하지 못했습니다."));
    },
  });

  function submit() {
    setFormError(undefined);
    const next = validateDemand(values);
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <div className="flex flex-col gap-4 rounded-card-flat border border-line p-5">
      <h3 className="text-body font-semibold text-ink">
        {condition ? "희망조건 수정" : "희망조건 등록"}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="거래유형"
          value={values.dealType}
          options={DEAL_TYPES.map((value) => ({ value, label: DEAL_TYPE_LABEL[value] }))}
          onValueChange={(value) => set("dealType", value)}
        />
        <SelectField
          label="카테고리"
          value={values.categoryId}
          options={[
            { value: "", label: "선택 안 함" },
            ...(categories.data?.items ?? [])
              .filter((item) => item.active)
              .map((item) => ({ value: String(item.categoryId), label: item.name })),
          ]}
          onValueChange={(value) => set("categoryId", value)}
        />
      </div>
      {RANGE_FIELDS.filter((range) => range.appliesTo.includes(dealType)).map((range) => (
        <div key={range.low} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label={`${range.label} 하한 (${range.unit})`}
            inputMode="decimal"
            value={values[range.low]}
            onValueChange={(value) => set(range.low, value)}
            error={errors[range.low]}
          />
          <TextField
            label={`${range.label} 상한 (${range.unit})`}
            inputMode="decimal"
            value={values[range.high]}
            onValueChange={(value) => set(range.high, value)}
            error={errors[range.high]}
          />
        </div>
      ))}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateTimeField
          label="입주 희망일"
          kind="date"
          value={values.moveInDate}
          onValueChange={(value) => set("moveInDate", value)}
        />
        <TextField
          label="희망 지역"
          hint="쉼표로 여러 지역을 구분해 입력하세요."
          value={values.regions}
          onValueChange={(value) => set("regions", value)}
        />
      </div>
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <div className="flex gap-2">
        <Button size="sm" isLoading={mutation.isPending} onClick={submit}>
          저장
        </Button>
        <Button size="sm" variant="cancel" onClick={onCancel} disabled={mutation.isPending}>
          취소
        </Button>
      </div>
    </div>
  );
}

function CandidateList({ conditionId }: { conditionId: number }) {
  const query = useCandidateProperties(conditionId, true);
  if (query.isPending) {
    return (
      <p role="status" className="text-caption text-ink-2">
        후보 매물을 찾는 중입니다.
      </p>
    );
  }
  if (query.isError) {
    return (
      <FormAlert>
        {describeCustomerError(query.error, "후보 매물을 불러오지 못했습니다.")}
      </FormAlert>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-card-flat bg-surface p-4">
      <p className="text-caption text-ink-2">
        희망조건을 단순 필터로 찾은 결과이며 적합성을 보증하지 않습니다.
      </p>
      {query.data.items.length === 0 ? (
        <p className="text-caption text-ink-2">조건에 맞는 후보 매물이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {query.data.items.map((item) => (
            <li key={`${item.propertyId}-${item.dealType}`} className="text-body text-ink">
              <Link
                href={`/properties/${item.propertyId}`}
                className="font-semibold text-primary hover:underline"
              >
                {item.name}
              </Link>{" "}
              · {isDealType(item.dealType) ? DEAL_TYPE_LABEL[item.dealType] : item.dealType}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConditionCard({
  customer,
  condition,
  canEdit,
  onNotice,
}: {
  customer: CustomerDetail;
  condition: Condition;
  canEdit: boolean;
  onNotice: (message: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  if (isEditing) {
    return (
      <DemandForm
        customer={customer}
        condition={condition}
        onDone={(message) => {
          setIsEditing(false);
          onNotice(message);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }
  const items = [
    { label: "거래유형", value: DEAL_TYPE_LABEL[condition.dealType] },
    ...(condition.dealType === "SALE"
      ? [{ label: "매매가", value: formatRange(condition.priceMin, condition.priceMax, "원") }]
      : [
          { label: "보증금", value: formatRange(condition.depositMin, condition.depositMax, "원") },
        ]),
    ...(condition.dealType === "MONTHLY"
      ? [{ label: "월세", value: formatRange(condition.rentMin, condition.rentMax, "원") }]
      : []),
    { label: "면적", value: formatRange(condition.areaMin, condition.areaMax, "㎡") },
    {
      label: "입주 희망일",
      value: condition.moveInDate ? formatSeoulDate(condition.moveInDate) : "-",
    },
    {
      label: "희망 지역",
      value:
        condition.regions.length === 0
          ? "-"
          : condition.regions.map((r) => r.regionName).join(", "),
    },
  ];
  return (
    <li className="flex flex-col gap-3 rounded-card-flat border border-line p-5">
      <DetailList items={items} />
      <div className="flex gap-2">
        {canEdit ? (
          <Button variant="outlined" size="sm" onClick={() => setIsEditing(true)}>
            희망조건 수정
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => setShowCandidates((value) => !value)}>
          {showCandidates ? "후보 매물 닫기" : "후보 매물 보기"}
        </Button>
      </div>
      {showCandidates ? <CandidateList conditionId={condition.conditionId} /> : null}
    </li>
  );
}

export function DemandPanel({ customer, canEdit }: { customer: CustomerDetail; canEdit: boolean }) {
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState<string>();
  return (
    <div className="flex flex-col gap-4">
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {customer.demandConditions.length === 0 ? (
        <p className="text-caption text-ink-2">등록된 희망조건이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {customer.demandConditions.map((condition) => (
            <ConditionCard
              key={`${condition.conditionId}-${condition.version}`}
              customer={customer}
              condition={condition}
              canEdit={canEdit}
              onNotice={setNotice}
            />
          ))}
        </ul>
      )}
      {isAdding ? (
        <DemandForm
          customer={customer}
          condition={null}
          onDone={(message) => {
            setIsAdding(false);
            setNotice(message);
          }}
          onCancel={() => setIsAdding(false)}
        />
      ) : canEdit ? (
        <div>
          <Button variant="outlined" size="sm" onClick={() => setIsAdding(true)}>
            희망조건 추가
          </Button>
        </div>
      ) : null}
    </div>
  );
}
