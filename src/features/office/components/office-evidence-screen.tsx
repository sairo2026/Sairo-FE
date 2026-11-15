"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { FieldLabel } from "@/shared/components/ui/field-label";
import { RadioGroup } from "@/shared/components/ui/select-field";
import { cn } from "@/shared/lib/cn";
import { submitEvidence } from "../api/office.api";
import { useRefreshOfficeState } from "../hooks/office-queries";
import { ENTITY_TYPE_LABEL } from "../model/labels";
import type { EvidenceType } from "../model/labels";
import { describeOfficeError, fieldErrorMap, isApiCode } from "../model/messages";
import { missingEvidence, requiredEvidenceTypes, validateEvidenceFile } from "../model/validation";
import type { EntityType } from "../model/validation";
import { ButtonRow, FlowFrame, MutedNote, TextLink } from "@/shared/components/feedback/page-parts";
import { EVIDENCE_NOTICE_COPY } from "../model/legal-copy";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function FolderUploadIcon() {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-ink-2"
    >
      <path d="M4 7a1 1 0 0 1 1-1h4.5l2 2.5H19a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" />
      <path d="M12 16v-5m0 0-2 2m2-2 2 2" />
    </svg>
  );
}

function EvidenceFileField({
  type,
  label,
  file,
  error,
  disabled,
  onSelect,
}: {
  type: EvidenceType;
  label: string;
  file: File | undefined;
  error: string | undefined;
  disabled: boolean;
  onSelect: (file: File | undefined) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-5">
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          aria-label={`${label} 파일 선택`}
          className={cn(
            "flex h-[58px] w-full items-center gap-4 rounded-control border bg-surface px-5 text-left text-body disabled:cursor-not-allowed",
            error ? "border-danger" : "border-line",
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              file ? "font-medium text-primary" : "font-normal text-ink-3",
            )}
          >
            {file ? file.name : "컴퓨터에서 파일 선택"}
          </span>
          <FolderUploadIcon />
        </button>
        <input
          ref={inputRef}
          id={inputId}
          data-evidence-type={type}
          type="file"
          accept="image/*,application/pdf"
          disabled={disabled}
          className="sr-only"
          onChange={(event) => onSelect(event.target.files?.[0])}
        />
      </div>
      <p className="sr-only">
        {file ? `선택됨 ${formatSize(file.size)}` : "아직 선택하지 않았습니다."}
      </p>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type OfficeEvidenceScreenProps = {
  registrationId: number | null;
  entity: EntityType;
  warning?: string | null;
};

export function OfficeEvidenceScreen({
  registrationId,
  entity,
  warning,
}: OfficeEvidenceScreenProps) {
  const router = useRouter();
  const refresh = useRefreshOfficeState();
  const [entityType, setEntityType] = useState<EntityType>(entity);
  const [files, setFiles] = useState<Partial<Record<EvidenceType, File>>>({});
  const [errors, setErrors] = useState<Partial<Record<EvidenceType, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [reviewLink, setReviewLink] = useState(false);

  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      if (registrationId === null) throw new Error("신청 번호가 없습니다.");
      return submitEvidence(registrationId, form);
    },
    onSuccess: async () => {
      await refresh();
      router.replace("/office/review");
    },
    onError: (caught) => {
      const mapped = fieldErrorMap(caught);
      const next: Partial<Record<EvidenceType, string>> = {};
      for (const item of requiredEvidenceTypes(entityType)) {
        if (mapped[item.type]) next[item.type] = mapped[item.type];
      }
      setErrors(next);
      if (isApiCode(caught, "INVALID_TRANSITION")) setReviewLink(true);
      const hasFieldMessage = Object.keys(next).length > 0;
      setFormError(
        hasFieldMessage
          ? "파일을 확인해 주세요. 형식이나 용량이 맞지 않거나 가려지지 않은 개인정보가 있을 수 있습니다."
          : describeOfficeError(caught, "증빙을 제출하지 못했습니다. 다시 시도해 주세요."),
      );
    },
  });

  if (registrationId === null) {
    return (
      <FlowFrame title="신청 정보를 찾을 수 없습니다" width="sm">
        <div className="flex flex-col gap-4">
          <FormAlert>
            신청 번호가 올바르지 않습니다. 심사 상태 화면에서 이어서 진행해 주세요.
          </FormAlert>
          <TextLink href="/office/review">심사 상태 확인하기</TextLink>
        </div>
      </FlowFrame>
    );
  }

  function select(type: EvidenceType, file: File | undefined) {
    setFormError(undefined);
    if (!file) {
      setFiles((current) => ({ ...current, [type]: undefined }));
      return;
    }
    const problem = validateEvidenceFile(file);
    if (problem) {
      setErrors((current) => ({ ...current, [type]: problem }));
      setFiles((current) => ({ ...current, [type]: undefined }));
      return;
    }
    setErrors((current) => ({ ...current, [type]: undefined }));
    setFiles((current) => ({ ...current, [type]: file }));
  }

  function submit() {
    setFormError(undefined);
    setReviewLink(false);
    const missing = missingEvidence(entityType, files);
    if (missing.length > 0) {
      const next: Partial<Record<EvidenceType, string>> = { ...errors };
      for (const type of missing) next[type] = "파일을 선택해 주세요.";
      setErrors(next);
      return;
    }
    const form = new FormData();
    for (const item of requiredEvidenceTypes(entityType)) {
      const file = files[item.type];
      if (!file) continue;
      form.append("evidenceType", item.type);
      form.append("file", file);
    }
    mutation.mutate(form);
  }

  return (
    <FlowFrame title="신규 사무소 등록을 위한 증빙 자료를 업로드해 주십시오.">
      <form
        noValidate
        className="flex flex-col gap-11"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-7">
          {requiredEvidenceTypes(entityType).map((item) => (
            <EvidenceFileField
              key={item.type}
              type={item.type}
              label={item.label}
              file={files[item.type]}
              error={errors[item.type]}
              disabled={mutation.isPending}
              onSelect={(file) => select(item.type, file)}
            />
          ))}
          <RadioGroup
            legend="신청 유형"
            name="evidenceEntityType"
            value={entityType}
            options={(Object.keys(ENTITY_TYPE_LABEL) as EntityType[]).map((value) => ({
              value,
              label: ENTITY_TYPE_LABEL[value],
            }))}
            onValueChange={(next) => setEntityType(next as EntityType)}
          />
          {warning === "DUPLICATE_BUSINESS_NUMBER" ? (
            <FormNotice>
              같은 사업자등록번호의 사무소가 이미 있습니다. 신청은 계속 진행되며 운영자가
              확인합니다.
            </FormNotice>
          ) : null}
          {formError ? (
            <div className="flex flex-col gap-2">
              <FormAlert>{formError}</FormAlert>
              {reviewLink ? <TextLink href="/office/review">심사 상태 확인하기</TextLink> : null}
            </div>
          ) : null}
        </div>
        <ButtonRow>
          <Button variant="cancel" onClick={() => router.push("/office/review")}>
            나중에 하기
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            등록
          </Button>
        </ButtonRow>
        <div className="flex flex-col gap-2">
          <MutedNote>PDF, JPG, PNG 파일을 한 장당 최대 10MB까지 올릴 수 있습니다.</MutedNote>
          <MutedNote>{EVIDENCE_NOTICE_COPY.masking}</MutedNote>
          <MutedNote>{EVIDENCE_NOTICE_COPY.retention}</MutedNote>
          {entityType === "CORPORATION" ? (
            <MutedNote>법인 신청은 대표권한과 등록관계 확인자료도 모두 올려야 합니다.</MutedNote>
          ) : null}
        </div>
      </form>
    </FlowFrame>
  );
}
