"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { TextField } from "@/shared/components/ui/text-field";
import { FailureNotice } from "../content-common/notice-banner";
import { describeContentError } from "../content-common/content-error";
import { useCompanyActions } from "./company-api";
import {
  BUSINESS_FIELDS,
  COMPANY_NOTICE_TEXTS,
  PRIVACY_FIELDS,
  SUPPORT_FIELDS,
  publicFooterRows,
  toCompanyRequest,
  validateCompanyForm,
} from "./company-model";
import type { CompanyErrors, CompanyFieldSpec, CompanyForm } from "./company-model";

function FieldGrid({
  fields,
  form,
  errors,
  onChange,
}: {
  fields: CompanyFieldSpec[];
  form: CompanyForm;
  errors: CompanyErrors;
  onChange: (key: CompanyFieldSpec["key"], value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          value={form[field.key]}
          error={errors[field.key]}
          placeholder={field.placeholder}
          onValueChange={(value) => onChange(field.key, value)}
        />
      ))}
    </div>
  );
}

export function PublicPreview({ form }: { form: CompanyForm }) {
  const rows = publicFooterRows(form);
  return (
    <Card title="공개 화면 노출 미리보기" tone="flat">
      <p className="mb-3 text-caption text-ink-2">
        공개 사이트 하단에 아래와 같이 노출됩니다. 비어 있는 항목은 표시하지 않습니다.
      </p>
      {rows.length === 0 ? (
        <p className="text-body text-ink-2">입력한 값이 없어 링크 줄만 표시됩니다.</p>
      ) : (
        <p aria-label="공개 하단 사업자 정보" className="text-caption text-ink">
          {rows.map((row) => `${row.label} ${row.value}`).join(" | ")}
        </p>
      )}
    </Card>
  );
}

export function CompanyFormCard({
  initial,
  onSaved,
}: {
  initial: CompanyForm;
  onSaved: (message: string) => void;
}) {
  const { create } = useCompanyActions();
  const [form, setForm] = useState<CompanyForm>(initial);
  const [errors, setErrors] = useState<CompanyErrors>({});
  const [failure, setFailure] = useState<string | null>(null);

  function change(key: CompanyFieldSpec["key"], value: string) {
    setForm({ ...form, [key]: value });
  }

  async function submit() {
    setFailure(null);
    const found = validateCompanyForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      const result = await create.mutateAsync(toCompanyRequest(form));
      onSaved(
        `회사 정보 ${result.versionNo}판을 게시했습니다. 실제 문의 수신 시험과 검토를 기록해 주세요.`,
      );
    } catch (caught) {
      setFailure(describeContentError(caught, "회사 정보를 게시하지 못했습니다."));
    }
  }

  return (
    <Card title="회사 정보 입력">
      <div className="flex flex-col gap-6">
        <ul className="list-disc pl-5 text-caption text-ink-2">
          {COMPANY_NOTICE_TEXTS.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <section aria-label="사업자 정보" className="flex flex-col gap-3">
          <h3 className="text-body font-semibold text-ink">사업자 정보</h3>
          <FieldGrid fields={BUSINESS_FIELDS} form={form} errors={errors} onChange={change} />
        </section>
        <section aria-label="고객 지원" className="flex flex-col gap-3">
          <h3 className="text-body font-semibold text-ink">고객 지원</h3>
          <FieldGrid fields={SUPPORT_FIELDS} form={form} errors={errors} onChange={change} />
        </section>
        <section aria-label="개인정보 창구와 해지 경로" className="flex flex-col gap-3">
          <h3 className="text-body font-semibold text-ink">개인정보 창구와 해지 경로</h3>
          <FieldGrid fields={PRIVACY_FIELDS} form={form} errors={errors} onChange={change} />
        </section>
        <PublicPreview form={form} />
        <FailureNotice message={failure} />
        <div>
          <Button isLoading={create.isPending} onClick={() => void submit()}>
            새 버전으로 게시
          </Button>
        </div>
      </div>
    </Card>
  );
}
