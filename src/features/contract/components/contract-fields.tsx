"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCustomers } from "@/features/customer/api/customer.api";
import { Button } from "@/shared/components/ui/button";
import { FieldLabel, OfficeFieldScope } from "@/shared/components/ui/field-label";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { TEXT_LIMITS } from "@/shared/lib/format";
import { useAssignableMembers } from "@/shared/session/assignable-members";
import { contractKeys } from "../hooks/contract-queries";
import { DEAL_TYPES, DEAL_TYPE_LABEL, isLease } from "../model/labels";
import { newParty } from "../model/form";
import type { ContractFormValues, PartyInput } from "../model/form";

export type FieldsProps = {
  values: ContractFormValues;
  onChange: (next: ContractFormValues) => void;
  errors: Record<string, string>;
  lockDealType?: boolean;
  hideManager?: boolean;
  managerOptional?: boolean;
  signedDateLabel?: string;
};

type CustomerOption = { value: string; label: string; phone: string };

/** 고객이 많아도 이름이나 연락처로 찾아 연결할 수 있게 검색어로 서버 조회를 덧붙인다. */
function CustomerLinkSelect({
  label,
  party,
  customers,
  onChange,
}: {
  label: string;
  party: PartyInput;
  customers: CustomerOption[];
  onChange: (customerId: string, found: CustomerOption | undefined) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const term = keyword.trim();
  const found = useQuery({
    queryKey: [...contractKeys.customerOptions, "search", term],
    queryFn: () => listCustomers({ keyword: term, page: 0, size: 30 }),
    enabled: term !== "",
  });
  const merged = new Map<string, CustomerOption>();
  const searched = (found.data?.items ?? []).map((item) => ({
    value: String(item.customerId),
    label: item.name,
    phone: item.phone ?? "",
  }));
  for (const item of term === "" ? customers : searched) merged.set(item.value, item);
  if (party.customerId !== "" && !merged.has(party.customerId)) {
    const known = customers.find((item) => item.value === party.customerId);
    merged.set(
      party.customerId,
      known ?? {
        value: party.customerId,
        label: party.name || `고객 ${party.customerId}`,
        phone: "",
      },
    );
  }
  const options = [...merged.values()];
  return (
    <div className="flex flex-col gap-2">
      <TextField
        label={`${label} 검색`}
        value={keyword}
        onValueChange={setKeyword}
        placeholder="이름이나 연락처로 찾기"
        maxLength={100}
      />
      <SelectField
        label={label}
        value={party.customerId}
        options={options}
        placeholder={
          term !== "" && !found.isPending && searched.length === 0 ? "검색 결과 없음" : "연결 안 함"
        }
        onValueChange={(customerId) =>
          onChange(
            customerId,
            options.find((item) => item.value === customerId),
          )
        }
      />
    </div>
  );
}

function PartyEditor({
  legend,
  parties,
  error,
  customers,
  onChange,
}: {
  legend: string;
  parties: PartyInput[];
  error?: string;
  customers: Array<{ value: string; label: string; phone: string }>;
  onChange: (next: PartyInput[]) => void;
}) {
  function update(key: string, patch: Partial<PartyInput>) {
    onChange(parties.map((party) => (party.key === key ? { ...party, ...patch } : party)));
  }
  return (
    <fieldset className="min-w-0 flex flex-col gap-3">
      <FieldLabel as="legend">{legend}</FieldLabel>
      {parties.map((party, index) => (
        <div
          key={party.key}
          className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-start"
        >
          <TextField
            label={`${legend} ${index + 1} 이름`}
            value={party.name}
            onValueChange={(name) => update(party.key, { name })}
            maxLength={100}
          />
          <TextField
            label={`${legend} ${index + 1} 연락처`}
            kind="tel"
            value={party.phone}
            onValueChange={(phone) => update(party.key, { phone })}
          />
          <CustomerLinkSelect
            label={`${legend} ${index + 1} 고객 연결`}
            party={party}
            customers={customers}
            onChange={(customerId, found) =>
              update(party.key, {
                customerId,
                ...(found && party.name.trim() === ""
                  ? { name: found.label, phone: found.phone }
                  : {}),
              })
            }
          />
          <Button
            variant="ghost"
            size="sm"
            className="sm:mt-7"
            aria-label={`${legend} ${index + 1} 삭제`}
            disabled={parties.length <= 1}
            onClick={() => onChange(parties.filter((item) => item.key !== party.key))}
          >
            삭제
          </Button>
        </div>
      ))}
      <div>
        <Button
          variant="outlined"
          size="sm"
          onClick={() => onChange([...parties, newParty()])}
          aria-label={`${legend} 추가`}
        >
          + 공동당사자 추가
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function ContractFields({
  values,
  onChange,
  errors,
  lockDealType = false,
  hideManager = false,
  managerOptional = false,
  signedDateLabel = "체결일",
}: FieldsProps) {
  const members = useAssignableMembers();
  const customers = useQuery({
    queryKey: contractKeys.customerOptions,
    queryFn: () => listCustomers({ page: 0, size: 100 }),
  });
  const customerOptions = (customers.data?.items ?? []).map((item) => ({
    value: String(item.customerId),
    label: item.name,
    phone: item.phone ?? "",
  }));
  const memberOptions = (members.data ?? []).map((item) => ({
    value: String(item.membershipId),
    label: item.displayName,
  }));
  const set = <K extends keyof ContractFormValues>(key: K, value: ContractFormValues[K]) =>
    onChange({ ...values, [key]: value });
  const lease = isLease(values.dealType);

  return (
    <OfficeFieldScope>
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 gap-x-[45px] gap-y-[22px] lg:grid-cols-[repeat(2,minmax(0,510px))]">
          <SelectField
            label="거래유형"
            required
            value={values.dealType}
            options={DEAL_TYPES.map((type) => ({
              value: type,
              label: DEAL_TYPE_LABEL[type] ?? type,
            }))}
            placeholder="거래유형 선택"
            onValueChange={(value) => set("dealType", value)}
            error={errors.dealType}
            disabled={lockDealType}
          />
          {hideManager ? null : (
            <SelectField
              label="담당 공인중개사"
              required={!managerOptional}
              value={values.managingMembershipId}
              options={memberOptions}
              placeholder={managerOptional ? "변경 안 함" : "담당자 선택"}
              onValueChange={(value) => set("managingMembershipId", value)}
              error={errors.managingMembershipId}
            />
          )}
          <DateTimeField
            label={signedDateLabel}
            kind="date"
            value={values.signedDate}
            onValueChange={(value) => set("signedDate", value)}
            error={errors.signedDate}
          />
        </div>
        <PartyEditor
          legend="매도·임대인"
          parties={values.sellerParties}
          error={errors.sellerLandlordParties}
          customers={customerOptions}
          onChange={(next) => set("sellerParties", next)}
        />
        <PartyEditor
          legend="매수·임차인"
          parties={values.buyerParties}
          error={errors.buyerTenantParties}
          customers={customerOptions}
          onChange={(next) => set("buyerParties", next)}
        />
        <div className="grid grid-cols-1 gap-x-[45px] gap-y-[22px] lg:grid-cols-[repeat(2,minmax(0,510px))]">
          {values.dealType === "SALE" ? (
            <TextField
              label="매매가(원)"
              kind="number"
              inputMode="numeric"
              value={values.salePrice}
              onValueChange={(value) => set("salePrice", value)}
              error={errors.salePrice}
            />
          ) : null}
          {lease ? (
            <TextField
              label="보증금(원)"
              kind="number"
              inputMode="numeric"
              value={values.depositAmount}
              onValueChange={(value) => set("depositAmount", value)}
              error={errors.depositAmount}
            />
          ) : null}
          {values.dealType === "MONTHLY" ? (
            <TextField
              label="월세(원)"
              kind="number"
              inputMode="numeric"
              value={values.monthlyRentAmount}
              onValueChange={(value) => set("monthlyRentAmount", value)}
              error={errors.monthlyRentAmount}
            />
          ) : null}
          {lease ? (
            <>
              <DateTimeField
                label="임대 시작일"
                kind="date"
                value={values.leaseStartDate}
                onValueChange={(value) => set("leaseStartDate", value)}
                error={errors.leaseStartDate}
              />
              <DateTimeField
                label="임대 만기일"
                kind="date"
                value={values.leaseEndDate}
                onValueChange={(value) => set("leaseEndDate", value)}
                error={errors.leaseEndDate}
              />
            </>
          ) : null}
          <DateTimeField
            label="잔금 예정일"
            kind="date"
            value={values.balanceDueDate}
            onValueChange={(value) => set("balanceDueDate", value)}
            error={errors.balanceDueDate}
          />
          <TextField
            label="잔금 예정일을 모르는 사유"
            value={values.balanceDueDatePendingReason}
            onValueChange={(value) => set("balanceDueDatePendingReason", value)}
            error={errors.balanceDueDatePendingReason}
            disabled={values.balanceDueDate !== ""}
            hint="날짜를 모르면 사유만 받고 임의 날짜로 채우지 않습니다."
          />
        </div>
        <TextAreaField
          id="contract-memo"
          label="업무 메모"
          rows={3}
          value={values.memo}
          onValueChange={(value) => set("memo", value)}
          error={errors.memo}
          hint={`${TEXT_LIMITS.contractMemo}자까지 입력할 수 있습니다.`}
        />
      </div>
    </OfficeFieldScope>
  );
}
