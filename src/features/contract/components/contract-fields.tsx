"use client";

import { useQuery } from "@tanstack/react-query";
import { listCustomers } from "@/features/customer/api/customer.api";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { SelectField } from "@/shared/components/ui/select-field";
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
    <fieldset className="flex flex-col gap-3 rounded-card-flat border border-line px-5 py-4">
      <legend className="px-1 text-caption font-semibold text-ink">{legend}</legend>
      {parties.map((party, index) => (
        <div key={party.key} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
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
          <SelectField
            label={`${legend} ${index + 1} 고객 연결`}
            value={party.customerId}
            options={customers}
            placeholder="연결 안 함"
            onValueChange={(customerId) => {
              const found = customers.find((item) => item.value === customerId);
              update(party.key, {
                customerId,
                ...(found && party.name.trim() === ""
                  ? { name: found.label, phone: found.phone }
                  : {}),
              });
            }}
          />
          <Button
            variant="ghost"
            size="sm"
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
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
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
      <div className="grid gap-4 sm:grid-cols-2">
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
      <div className="flex flex-col gap-2">
        <label htmlFor="contract-memo" className="text-caption font-semibold text-ink">
          업무 메모
        </label>
        <textarea
          id="contract-memo"
          rows={3}
          value={values.memo}
          onChange={(event) => set("memo", event.target.value)}
          aria-invalid={errors.memo ? true : undefined}
          className="w-full rounded-control border border-line px-4 py-3 text-body text-ink focus:border-primary"
        />
        <p className="text-caption text-ink-3">
          {TEXT_LIMITS.contractMemo}자까지 입력할 수 있습니다.
        </p>
        {errors.memo ? (
          <p role="alert" className="text-caption text-danger">
            {errors.memo}
          </p>
        ) : null}
      </div>
    </div>
  );
}
