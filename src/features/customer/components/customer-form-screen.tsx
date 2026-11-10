"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { CustomerDetailResponse } from "@/lib/api/contracts/customer.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { RadioGroup, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { useAssignableMembers } from "@/shared/session/assignable-members";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createCustomer, findDuplicateCustomers, updateCustomer } from "../api/customer.api";
import { customerKeys, useCustomerDetail } from "../hooks/customer-queries";
import {
  EMPTY_CUSTOMER_FORM,
  formFromDetail,
  toCreateRequest,
  toUpdateRequest,
  validateCustomerForm,
} from "../model/form";
import type { CustomerFormErrors, CustomerFormField, CustomerFormValues } from "../model/form";
import {
  CUSTOMER_ROLE_LABEL,
  CUSTOMER_ROLE_TONE,
  PROCESSING_BASES,
  PROCESSING_BASIS_LABEL,
  isCustomerRole,
} from "../model/labels";
import { CUSTOMER_COLLECTION_COPY } from "../model/legal-copy";
import { describeCustomerError, fieldErrorMap, isApiCode } from "../model/messages";

type DuplicateItem = {
  customerId: number;
  name: string;
  phone: string | null;
  roles: string[];
  deletedAt: string | null;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card tone="flat" title={title}>
      <div className="flex flex-col gap-5">{children}</div>
    </Card>
  );
}

function TextAreaField({
  label,
  value,
  onValueChange,
  error,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-caption font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        rows={4}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onValueChange(event.target.value)}
        className="rounded-control border border-line bg-surface p-4 text-body text-ink focus:border-primary focus:bg-white"
      />
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function DuplicateDialog({
  items,
  isPending,
  onUseExisting,
  onCreateNew,
  onClose,
}: {
  items: DuplicateItem[];
  isPending: boolean;
  onUseExisting: (customerId: number) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen
      title="같은 이름과 연락처의 고객이 있습니다"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={isPending}>
            돌아가기
          </Button>
          <Button isLoading={isPending} onClick={onCreateNew}>
            새 고객으로 등록
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p>자동으로 합치지 않습니다. 기존 고객을 쓰거나 별도 고객으로 새로 등록해 주세요.</p>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.customerId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card-flat border border-line p-3"
            >
              <span className="flex flex-wrap items-center gap-2">
                <strong>{item.name}</strong>
                <span>{item.phone ?? "-"}</span>
                {item.roles.map((role) =>
                  isCustomerRole(role) ? (
                    <Badge
                      key={role}
                      tone={CUSTOMER_ROLE_TONE[role]}
                      className="h-7 min-w-[64px] px-3 text-caption"
                    >
                      {CUSTOMER_ROLE_LABEL[role]}
                    </Badge>
                  ) : null,
                )}
                {item.deletedAt ? (
                  <Badge tone="gray" className="h-7 min-w-[56px] px-3 text-caption">
                    보관됨
                  </Badge>
                ) : null}
              </span>
              <Button variant="outlined" size="sm" onClick={() => onUseExisting(item.customerId)}>
                기존 고객 사용
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

type FormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      detail: CustomerDetailResponse;
      onReload: () => void;
    };

export function CustomerForm(props: FormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const detail = props.mode === "edit" ? props.detail : null;
  const isEdit = detail !== null;
  const live = useCustomerDetail(detail?.customerId ?? 0);
  const current = live.data ?? detail;

  const [values, setValues] = useState<CustomerFormValues>(() =>
    detail ? formFromDetail(detail) : EMPTY_CUSTOMER_FORM,
  );
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isConflict, setIsConflict] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateItem[] | null>(null);
  const members = useAssignableMembers();

  function setField<K extends CustomerFormField>(key: K, value: CustomerFormValues[K]) {
    setValues((existing) => ({ ...existing, [key]: value }));
    setErrors((existing) => ({ ...existing, [key]: undefined }));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (detail) {
        await updateCustomer(
          detail.customerId,
          toUpdateRequest(values),
          current?.version ?? detail.version,
        );
        return detail.customerId;
      }
      const created = await createCustomer(toCreateRequest(values));
      return created.customerId;
    },
    onSuccess: async (customerId) => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      router.push(`/customers/${customerId}`);
    },
    onError: async (caught) => {
      if (isApiCode(caught, "VERSION_CONFLICT")) {
        setIsConflict(true);
        await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      }
      const mapped = fieldErrorMap(caught);
      if (Object.keys(mapped).length > 0) {
        setErrors((existing) => ({ ...existing, ...mapped }));
      }
      setFormError(
        describeCustomerError(caught, "고객을 저장하지 못했습니다. 다시 시도해 주세요."),
      );
    },
  });

  async function submit() {
    setFormError(undefined);
    setIsConflict(false);
    const nextErrors = validateCustomerForm(values, { isCreate: !isEdit });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!isEdit && values.name.trim() !== "" && values.phone.trim() !== "") {
      try {
        const result = await findDuplicateCustomers(values.name.trim(), values.phone.trim());
        if (result.items.length > 0) {
          setDuplicates(result.items);
          return;
        }
      } catch (caught) {
        setFormError(describeCustomerError(caught, "같은 고객이 있는지 확인하지 못했습니다."));
        return;
      }
    }
    saveMutation.mutate();
  }

  const nameLabel = values.isCorporation ? "법인명" : "이름";

  return (
    <form
      noValidate
      className="flex max-w-3xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <PageHeader title={isEdit ? "고객 수정" : "고객 등록"} />
      {isReadOnly ? (
        <FormNotice>
          결제가 지연되어 읽기만 가능합니다. 저장하려면 결제를 먼저 마쳐 주세요.
        </FormNotice>
      ) : null}
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      {isConflict && props.mode === "edit" ? (
        <div>
          <Button variant="outlined" size="sm" onClick={props.onReload}>
            최신 내용 불러오기
          </Button>
        </div>
      ) : null}
      <FormNotice>
        주민등록번호와 전체 금융계좌번호는 입력할 수 없습니다. 입력하면 저장되지 않습니다.
      </FormNotice>

      <Section title="기본 정보">
        <RadioGroup
          legend="고객 구분"
          name="customer-kind"
          value={values.isCorporation ? "corporation" : "individual"}
          options={[
            { value: "individual", label: "개인" },
            { value: "corporation", label: "법인" },
          ]}
          onValueChange={(value) => setField("isCorporation", value === "corporation")}
        />
        <TextField
          label={nameLabel}
          required
          value={values.name}
          maxLength={100}
          onValueChange={(value) => setField("name", value)}
          error={errors.name}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="연락처"
            kind="tel"
            value={values.phone}
            onValueChange={(value) => setField("phone", value)}
            error={errors.phone}
          />
          <TextField
            label="보조 연락처"
            kind="tel"
            value={values.secondaryPhone}
            hint="대리 연락자를 쓰는 경우 번호를 넣고 업무 메모에 대리인 정보를 적어 주세요."
            onValueChange={(value) => setField("secondaryPhone", value)}
            error={errors.secondaryPhone}
          />
        </div>
        <TextField
          label="이메일"
          value={values.email}
          onValueChange={(value) => setField("email", value)}
          error={errors.email}
        />
        <SelectField
          label="담당 공인중개사"
          required
          value={values.managingMembershipId}
          placeholder="담당자를 선택해 주세요."
          options={(members.data ?? []).map((item) => ({
            value: String(item.membershipId),
            label: item.displayName,
          }))}
          onValueChange={(value) => setField("managingMembershipId", value)}
          error={errors.managingMembershipId}
        />
        <TextAreaField
          label="업무 메모"
          value={values.memo}
          onValueChange={(value) => setField("memo", value)}
          error={errors.memo}
        />
        <p className="-mt-3 text-caption text-ink-2">{CUSTOMER_COLLECTION_COPY.memoGuide}</p>
      </Section>

      <Section title="개인정보 수집 안내">
        <p className="text-caption text-ink-2">
          고객 정보를 왜 모으는지, 어떤 근거로 처리하는지, 언제까지 보관하는지 기록합니다.
        </p>
        <TextField
          label="수집 경로"
          required
          value={values.dataSource}
          hint={CUSTOMER_COLLECTION_COPY.sourceHint}
          onValueChange={(value) => setField("dataSource", value)}
          error={errors.dataSource}
        />
        <SelectField
          label="처리 근거"
          required={!isEdit}
          value={values.processingBasis}
          placeholder="처리 근거를 선택해 주세요."
          options={PROCESSING_BASES.map((value) => ({
            value,
            label: PROCESSING_BASIS_LABEL[value] ?? value,
          }))}
          onValueChange={(value) => setField("processingBasis", value)}
          error={errors.processingBasis}
        />
        <p className="-mt-3 text-caption text-ink-2">{CUSTOMER_COLLECTION_COPY.basisHint}</p>
        <TextField
          label="수집 목적"
          required
          value={values.dataPurpose}
          onValueChange={(value) => setField("dataPurpose", value)}
          error={errors.dataPurpose}
        />
        <DateTimeField
          label="보유 기한"
          kind="date"
          required
          value={values.retentionUntil}
          onValueChange={(value) => setField("retentionUntil", value)}
          error={errors.retentionUntil}
        />
        <p className="-mt-3 text-caption text-ink-2">{CUSTOMER_COLLECTION_COPY.retentionHint}</p>
      </Section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={detail ? `/customers/${detail.customerId}` : "/customers"}
          className="inline-flex h-12 min-w-[120px] items-center justify-center rounded-control bg-primary-soft px-10 text-body font-medium text-ink-2 hover:bg-primary-line"
        >
          취소
        </Link>
        <Button type="submit" isLoading={saveMutation.isPending} disabled={isReadOnly}>
          {isEdit ? "저장" : "등록"}
        </Button>
      </div>

      {duplicates ? (
        <DuplicateDialog
          items={duplicates}
          isPending={saveMutation.isPending}
          onUseExisting={(customerId) => router.push(`/customers/${customerId}`)}
          onCreateNew={() => {
            setDuplicates(null);
            saveMutation.mutate();
          }}
          onClose={() => setDuplicates(null)}
        />
      ) : null}
    </form>
  );
}

export function CustomerCreateScreen() {
  return <CustomerForm mode="create" />;
}

export function CustomerEditScreen({ customerId }: { customerId: number }) {
  const query = useCustomerDetail(customerId);
  const [resetKey, setResetKey] = useState(0);
  const queryClient = useQueryClient();
  return (
    <QueryGate query={query} loadingLabel="고객 정보를 불러오는 중입니다.">
      {(detail) =>
        detail.status === "MERGED" ? (
          <FormAlert>
            병합된 고객은 수정할 수 없습니다.{" "}
            {detail.mergedIntoCustomerId ? (
              <Link href={`/customers/${detail.mergedIntoCustomerId}`} className="underline">
                남은 고객으로 이동
              </Link>
            ) : null}
          </FormAlert>
        ) : detail.deletedAt ? (
          <FormAlert>
            보관된 고객은 수정할 수 없습니다. 고객 상세에서 복원한 뒤 수정해 주세요.
          </FormAlert>
        ) : (
          <CustomerForm
            key={`${customerId}-${resetKey}`}
            mode="edit"
            detail={detail}
            onReload={() => {
              void queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
              setResetKey((value) => value + 1);
            }}
          />
        )
      }
    </QueryGate>
  );
}
