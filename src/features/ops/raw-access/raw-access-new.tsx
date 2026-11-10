"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { RadioGroup, SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { OpsScreen } from "../components/common/ops-screen";
import { describeOpsError } from "../model/ops-errors";
import { useCreateRawAccess } from "./raw-access-api";
import { BASIS_TYPE_LABELS, REQUEST_TYPE_LABELS, TARGET_TYPE_LABELS } from "./raw-access-model";

const TARGET_TYPES = Object.keys(TARGET_TYPE_LABELS);

type FormState = {
  requestType: string;
  targetType: string;
  targetId: string;
  officeId: string;
  purpose: string;
  scope: string;
  minutes: string;
  basisType: string;
  basisNote: string;
  linkedInquiryId: string;
  beneficiaryOperatorId: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

function positiveInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (positiveInt(form.targetId) === null) errors.targetId = "대상 ID를 숫자로 입력해 주세요.";
  if (form.officeId !== "" && positiveInt(form.officeId) === null) {
    errors.officeId = "사무소 ID를 숫자로 입력해 주세요.";
  }
  if (form.purpose.trim() === "") errors.purpose = "열람 사유를 입력해 주세요.";
  if (form.scope.trim() === "") errors.scope = "범위를 입력해 주세요.";
  const minutes = positiveInt(form.minutes);
  if (minutes === null || minutes > 60)
    errors.minutes = "만료 시간은 1분에서 60분 사이로 입력해 주세요.";
  if (form.basisNote.trim() === "") errors.basisNote = "근거 내용을 입력해 주세요.";
  if (form.basisType === "REPRESENTATIVE_REQUEST" && positiveInt(form.linkedInquiryId) === null) {
    errors.linkedInquiryId = "대표의 지원 요청 근거에는 연결 문의 ID가 필요합니다.";
  } else if (form.linkedInquiryId !== "" && positiveInt(form.linkedInquiryId) === null) {
    errors.linkedInquiryId = "연결 문의 ID를 숫자로 입력해 주세요.";
  }
  if (form.beneficiaryOperatorId !== "" && positiveInt(form.beneficiaryOperatorId) === null) {
    errors.beneficiaryOperatorId = "수혜자 운영자 ID를 숫자로 입력해 주세요.";
  }
  return errors;
}

function RawAccessForm() {
  const params = useSearchParams();
  const router = useRouter();
  const create = useCreateRawAccess();
  const initialTarget = params.get("targetType") ?? "";
  const [form, setForm] = useState<FormState>({
    requestType: "RAW_VIEW",
    targetType: TARGET_TYPES.includes(initialTarget) ? initialTarget : "OFFICE",
    targetId: params.get("targetId") ?? "",
    officeId: params.get("officeId") ?? "",
    purpose: "",
    scope: "",
    minutes: "60",
    basisType: "REPRESENTATIVE_REQUEST",
    basisNote: "",
    linkedInquiryId: params.get("linkedInquiryId") ?? "",
    beneficiaryOperatorId: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      const created = await create.mutateAsync({
        requestType: form.requestType,
        targetType: form.targetType,
        targetId: Number(form.targetId),
        purpose: form.purpose.trim(),
        scope: form.scope.trim(),
        requestedExpiresMinutes: Number(form.minutes),
        basisType: form.basisType,
        basisNote: form.basisNote.trim(),
        linkedInquiryId: form.linkedInquiryId === "" ? null : Number(form.linkedInquiryId),
        officeId: form.officeId === "" ? null : Number(form.officeId),
        beneficiaryOperatorId:
          form.beneficiaryOperatorId === "" ? null : Number(form.beneficiaryOperatorId),
      });
      router.push(`/ops/raw-access/${created.requestId}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "RESOURCE_NOT_FOUND") {
        setFailure(
          "연결 문의나 대상 사무소를 찾을 수 없어 요청이 만들어지지 않았습니다. 번호를 확인해 주세요.",
        );
      } else if (error instanceof ApiError && error.status === 400 && error.fieldErrors?.length) {
        setFailure(error.fieldErrors.map((item) => item.message).join(" "));
      } else {
        setFailure(describeOpsError(error, "요청을 만들지 못했습니다."));
      }
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
      <Card title="접근 종류">
        <div className="flex flex-col gap-3">
          <RadioGroup
            legend="요청 종류"
            name="requestType"
            value={form.requestType}
            onValueChange={(value) => set("requestType", value)}
            options={Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <p className="text-caption text-ink-2">
            열람과 다운로드는 종류별로 따로 요청하고 따로 승인받습니다. 열람 승인으로는 파일을 받을
            수 없습니다. 열람은 승인 뒤 실행하면 최대 60분만 볼 수 있고, 다운로드는 별도 승인이
            필요하며 파일은 한 번만 받을 수 있습니다.
          </p>
        </div>
      </Card>
      <Card title="대상">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="대상 종류"
            value={form.targetType}
            onValueChange={(value) => set("targetType", value)}
            options={TARGET_TYPES.map((value) => ({
              value,
              label: TARGET_TYPE_LABELS[value] ?? value,
            }))}
          />
          <TextField
            label="대상 ID"
            kind="number"
            value={form.targetId}
            onValueChange={(value) => set("targetId", value)}
            error={errors.targetId}
            required
          />
          <TextField
            label="대상 사무소 ID"
            kind="number"
            value={form.officeId}
            onValueChange={(value) => set("officeId", value)}
            error={errors.officeId}
            hint="선택 입력입니다. 없는 사무소 번호이면 요청이 만들어지지 않습니다."
          />
        </div>
      </Card>
      <Card title="사유와 범위">
        <div className="flex flex-col gap-4">
          <TextAreaField
            label="열람 사유"
            value={form.purpose}
            onValueChange={(value) => set("purpose", value)}
            error={errors.purpose}
            maxLength={500}
            rows={3}
          />
          <TextField
            label="범위"
            value={form.scope}
            onValueChange={(value) => set("scope", value)}
            error={errors.scope}
            maxLength={200}
            hint="볼 정보의 범위를 필요한 만큼만 적어 주세요."
          />
          <TextField
            label="만료 시간(분)"
            kind="number"
            value={form.minutes}
            onValueChange={(value) => set("minutes", value)}
            error={errors.minutes}
            hint="1분에서 60분까지 입력할 수 있습니다."
          />
        </div>
      </Card>
      <Card title="근거">
        <div className="flex flex-col gap-4">
          <RadioGroup
            legend="근거 종류"
            name="basisType"
            value={form.basisType}
            onValueChange={(value) => set("basisType", value)}
            options={Object.entries(BASIS_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <TextAreaField
            label="근거 내용"
            value={form.basisNote}
            onValueChange={(value) => set("basisNote", value)}
            error={errors.basisNote}
            maxLength={1000}
            rows={3}
          />
          <TextField
            label={
              form.basisType === "REPRESENTATIVE_REQUEST" ? "연결 문의 ID(필수)" : "연결 문의 ID"
            }
            kind="number"
            value={form.linkedInquiryId}
            onValueChange={(value) => set("linkedInquiryId", value)}
            error={errors.linkedInquiryId}
          />
          <TextField
            label="수혜자 운영자 ID"
            kind="number"
            value={form.beneficiaryOperatorId}
            onValueChange={(value) => set("beneficiaryOperatorId", value)}
            error={errors.beneficiaryOperatorId}
            hint="선택 입력입니다. 비우면 요청자 본인이 실행합니다. 요청자와 수혜자는 이 요청을 직접 승인할 수 없습니다."
          />
        </div>
      </Card>
      {failure ? (
        <p role="alert" className="text-caption text-danger">
          {failure}
        </p>
      ) : null}
      <div>
        <Button type="submit" isLoading={create.isPending}>
          승인 요청
        </Button>
      </div>
    </form>
  );
}

export function RawAccessNewScreen() {
  return (
    <OpsScreen
      title="원문 접근 요청"
      description="고객의 원본 정보를 봐야 할 때 개인정보담당의 승인을 받습니다. 모든 처리는 감사 로그에 남습니다."
      roles={[]}
    >
      <RawAccessForm />
    </OpsScreen>
  );
}
