"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { MutedNote, TextLink } from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { fieldErrorMap } from "@/shared/lib/api-messages";
import { saveTaxRecipient } from "../api/billing.api";
import type { TaxRecipient } from "../api/wire";
import { billingKeys, useTaxRecipient } from "../hooks/billing-queries";
import { TAX_TYPES } from "../model/labels";
import { TAX_COPY } from "../model/legal-copy";
import { describeBillingError } from "../model/messages";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type TaxForm = {
  businessNumber: string;
  companyName: string;
  representativeName: string;
  receiverEmail: string;
  taxType: string;
  issueRequested: boolean;
};

export function validateTaxForm(form: TaxForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^\d{10}$/.test(form.businessNumber)) {
    errors.businessNumber = TAX_COPY.businessNumberError;
  }
  if (form.companyName.trim() === "") errors.companyName = "상호를 입력해 주세요.";
  if (form.representativeName.trim() === "")
    errors.representativeName = "대표자 이름을 입력해 주세요.";
  if (!EMAIL_PATTERN.test(form.receiverEmail.trim())) {
    errors.receiverEmail = TAX_COPY.emailError;
  }
  if (form.taxType === "") errors.taxType = "과세유형을 선택해 주세요.";
  return errors;
}

function TaxForm({ initial }: { initial: TaxRecipient }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TaxForm>({
    businessNumber: (initial.businessNumber ?? "").replace(/\D/g, ""),
    companyName: initial.companyName ?? "",
    representativeName: initial.representativeName ?? "",
    receiverEmail: initial.receiverEmail ?? "",
    taxType: initial.taxType ?? "GENERAL",
    issueRequested: initial.issueRequested,
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      saveTaxRecipient({
        businessNumber: form.businessNumber,
        companyName: form.companyName.trim(),
        representativeName: form.representativeName.trim(),
        receiverEmail: form.receiverEmail.trim(),
        taxType: form.taxType,
        issueRequested: form.issueRequested,
      }),
    onSuccess: async () => {
      setFormError(undefined);
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: billingKeys.taxRecipient });
    },
    onError: (caught) => {
      setSaved(false);
      setErrors(fieldErrorMap(caught));
      setFormError(
        describeBillingError(caught, "저장하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."),
      );
    },
  });

  function update<K extends keyof TaxForm>(key: K, value: TaxForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSaved(false);
  }

  return (
    <Card title="수신 정보">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const problems = validateTaxForm(form);
          setErrors(problems);
          if (Object.keys(problems).length > 0) return;
          setFormError(undefined);
          mutation.mutate();
        }}
      >
        {initial.registered ? null : (
          <MutedNote>사무소 정보로 채운 초기값입니다. 확인하고 바꿔 주세요.</MutedNote>
        )}
        <TextField
          label="사업자등록번호"
          kind="number"
          inputMode="numeric"
          maxLength={10}
          value={form.businessNumber}
          onValueChange={(next) => update("businessNumber", next.replace(/\D/g, ""))}
          hint="숫자 10자리"
          error={errors.businessNumber}
        />
        <TextField
          label="상호"
          value={form.companyName}
          onValueChange={(next) => update("companyName", next)}
          maxLength={100}
          error={errors.companyName}
        />
        <TextField
          label="대표자 이름"
          value={form.representativeName}
          onValueChange={(next) => update("representativeName", next)}
          maxLength={50}
          error={errors.representativeName}
        />
        <TextField
          label="수신 이메일"
          inputMode="email"
          value={form.receiverEmail}
          onValueChange={(next) => update("receiverEmail", next)}
          maxLength={254}
          error={errors.receiverEmail}
        />
        <SelectField
          label="과세유형"
          value={form.taxType}
          options={TAX_TYPES.map((item) => ({ value: item.value, label: item.label }))}
          onValueChange={(next) => update("taxType", next)}
          error={errors.taxType}
        />
        <Checkbox
          checked={form.issueRequested}
          onCheckedChange={(next) => update("issueRequested", next)}
          label="세금계산서 발급을 요청합니다"
        />
        <MutedNote>{TAX_COPY.paymentMethod}</MutedNote>
        <MutedNote>{TAX_COPY.receipt}</MutedNote>
        {saved ? <FormNotice>{TAX_COPY.saved}</FormNotice> : null}
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <div>
          <Button type="submit" isLoading={mutation.isPending}>
            저장
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function TaxRecipientScreen() {
  const query = useTaxRecipient();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="세금계산서 수신 정보"
        description={TAX_COPY.intro}
        actions={<TextLink href="/billing">구독 현황으로</TextLink>}
      />
      <QueryGate query={query} loadingLabel="수신 정보를 불러오는 중입니다.">
        {(recipient) => <TaxForm initial={recipient} />}
      </QueryGate>
    </div>
  );
}
