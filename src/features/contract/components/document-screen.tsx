"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ContractDetailResponse } from "@/lib/api/contracts/contract.schema";
import { CONTRACT_ENTRY_COPY } from "@/shared/legal/notice-copy";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { fieldErrorMap } from "@/shared/lib/api-messages";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import {
  fetchDocumentDownload,
  uploadDocument,
  uploadDocumentRevision,
} from "../api/contract-extra.api";
import { contractKeys, useRevisions } from "../hooks/contract-queries";
import { toDocumentForm, validateDocumentForm, DOCUMENT_MAX_BYTES } from "../model/document";
import type { DocumentFormValues } from "../model/document";
import { DOCUMENT_TYPE_LABEL, RETENTION_NOTE, labelOf } from "../model/labels";
import { describeContractError } from "../model/messages";
import { ContractSubScreen } from "./contract-sub-screen";

type Document = ContractDetailResponse["documents"][number];

const EMPTY: DocumentFormValues = {
  documentType: "",
  writtenDate: "",
  deliveredDate: "",
  datePendingReason: "",
  piiReviewed: false,
  piiMaskingConfirmed: false,
};

function UploadDialog({
  detail,
  target,
  onClose,
}: {
  detail: ContractDetailResponse;
  target: Document | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const missing = ["SALES_CONTRACT", "DISCLOSURE_STATEMENT"].filter(
    (type) => !detail.documents.some((item) => item.documentType === type),
  );
  const [values, setValues] = useState<DocumentFormValues>({
    ...EMPTY,
    documentType: target?.documentType ?? "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const set = <K extends keyof DocumentFormValues>(key: K, value: DocumentFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      if (!file || detail.currentRevisionId === null || detail.currentRevisionId === undefined) {
        throw new Error("업로드할 수 없는 상태입니다.");
      }
      const form = toDocumentForm(values, file, detail.currentRevisionId, target === null);
      return target
        ? uploadDocumentRevision(detail.contractId, target.documentId, form)
        : uploadDocument(detail.contractId, form);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contractKeys.all });
      onClose();
    },
    onError: (error) => {
      setErrors((current) => ({ ...current, ...fieldErrorMap(error) }));
      setFormError(describeContractError(error, "서류를 올리지 못했습니다."));
    },
  });

  function submit() {
    const next = validateDocumentForm(values, file, { needsType: target === null });
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFormError(undefined);
    mutation.mutate();
  }

  return (
    <Modal
      isOpen
      size="wide"
      title={
        target
          ? `${labelOf(DOCUMENT_TYPE_LABEL, target.documentType)} 정정본 올리기`
          : "서류 올리기"
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button onClick={submit} isLoading={mutation.isPending}>
            올리기
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        {target ? (
          <FormNotice>
            정정본은 새 버전으로 올라가며 이전 버전은 그대로 남습니다. 이전 버전의 보존 종료일을
            덮어쓰지 않습니다.
          </FormNotice>
        ) : (
          <SelectField
            label="서류 종류"
            required
            value={values.documentType}
            options={missing.map((type) => ({
              value: type,
              label: `${labelOf(DOCUMENT_TYPE_LABEL, type)} (${labelOf(RETENTION_NOTE, type)})`,
            }))}
            placeholder="종류 선택"
            onValueChange={(value) => set("documentType", value)}
            error={errors.documentType}
          />
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="document-file" className="text-caption font-semibold text-ink">
            파일 (PDF, JPG, PNG, {DOCUMENT_MAX_BYTES / 1024 / 1024}MB 이하)
          </label>
          <input
            id="document-file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setErrors((current) => ({ ...current, file: "" }));
            }}
            aria-invalid={errors.file ? true : undefined}
          />
          {errors.file ? (
            <p role="alert" className="text-caption text-danger">
              {errors.file}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DateTimeField
            label="작성일"
            kind="date"
            value={values.writtenDate}
            onValueChange={(value) => set("writtenDate", value)}
          />
          <DateTimeField
            label="교부일"
            kind="date"
            value={values.deliveredDate}
            onValueChange={(value) => set("deliveredDate", value)}
          />
        </div>
        <TextField
          label="날짜를 확인하지 못한 사유"
          value={values.datePendingReason}
          onValueChange={(value) => set("datePendingReason", value)}
          error={errors.datePendingReason}
          hint="날짜가 하나라도 불명확하면 사유를 입력합니다. 업로드일을 임의로 대입하지 않으며 보존 종료일은 비워 보완 대상으로 둡니다."
        />
        <Checkbox
          label="주민등록번호 등 개인정보 포함 여부를 확인했습니다"
          checked={values.piiReviewed}
          onCheckedChange={(value) => set("piiReviewed", value)}
        />
        {errors.piiReviewed ? (
          <p role="alert" className="text-caption text-danger">
            {errors.piiReviewed}
          </p>
        ) : null}
        <Checkbox
          label="주민등록번호를 가린 사본입니다"
          checked={values.piiMaskingConfirmed}
          onCheckedChange={(value) => set("piiMaskingConfirmed", value)}
        />
        {values.piiMaskingConfirmed ? (
          <FormNotice>{CONTRACT_ENTRY_COPY.maskedCopy}</FormNotice>
        ) : null}
      </div>
    </Modal>
  );
}

function DownloadButton({ contractId, document }: { contractId: number; document: Document }) {
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: () => fetchDocumentDownload(contractId, document.documentId),
    onSuccess: (result) => {
      setError(undefined);
      setLink({ url: result.downloadUrl, expiresAt: result.expiresAt });
    },
    onError: (failure) =>
      setError(describeContractError(failure, "다운로드 링크를 만들지 못했습니다.")),
  });
  return (
    <span className="flex flex-col items-start gap-1">
      <Button
        variant="ghost"
        size="sm"
        isLoading={mutation.isPending}
        aria-label={`${labelOf(DOCUMENT_TYPE_LABEL, document.documentType)} 버전 ${document.versionNo} 다운로드 링크 받기`}
        onClick={() => mutation.mutate()}
      >
        다운로드 링크 받기
      </Button>
      {link ? (
        <span className="text-caption text-ink-2">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline"
          >
            파일 열기
          </a>{" "}
          · 만료 {formatSeoulDateTime(link.expiresAt)}
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="text-caption text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}

function DocumentBody({ detail }: { detail: ContractDetailResponse }) {
  const { isReadOnly } = useOfficeAccess();
  const revisions = useRevisions(detail.contractId, detail.contractStatus !== "DRAFT");
  const numbers = new Map(
    (revisions.data?.items ?? []).map((item) => [item.revisionId, item.revisionNo]),
  );
  const [dialog, setDialog] = useState<{ target: Document | null } | null>(null);
  const isDraft = detail.contractStatus === "DRAFT";
  const missing = ["SALES_CONTRACT", "DISCLOSURE_STATEMENT"].filter(
    (type) => !detail.documents.some((item) => item.documentType === type),
  );
  const latestByType = new Map<string, number>();
  for (const item of detail.documents) {
    latestByType.set(
      item.documentType,
      Math.max(latestByType.get(item.documentType) ?? 0, item.versionNo),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FormNotice>
        거래계약서와 중개대상물 확인·설명서를 따로 올립니다. 보존기간은 거래계약서 5년, 확인·설명서
        3년이며 작성일과 교부일 중 늦은 날을 기준으로 계산합니다.
      </FormNotice>
      <FormNotice>{CONTRACT_ENTRY_COPY.documents}</FormNotice>
      {isDraft ? (
        <FormNotice>초안 계약에는 서류를 올릴 수 없습니다. 체결 뒤 올려 주세요.</FormNotice>
      ) : missing.length > 0 ? (
        <p
          role="alert"
          className="rounded-control bg-tag-red px-4 py-3 text-caption text-tag-red-ink"
        >
          아직 첨부되지 않은 서류:{" "}
          {missing.map((type) => labelOf(DOCUMENT_TYPE_LABEL, type)).join(", ")}
        </p>
      ) : null}
      <div>
        <Button
          disabled={isDraft || isReadOnly || missing.length === 0}
          onClick={() => setDialog({ target: null })}
        >
          + 서류 올리기
        </Button>
      </div>
      {detail.documents.length === 0 ? (
        <p className="text-caption text-ink-3">첨부된 서류가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {detail.documents.map((document) => (
            <li
              key={document.documentId}
              className="flex flex-col gap-2 rounded-card-flat border border-line px-5 py-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-body font-bold text-ink">
                  {labelOf(DOCUMENT_TYPE_LABEL, document.documentType)}
                </span>
                <span className="text-caption text-ink-2">문서 버전 {document.versionNo}</span>
                <span className="text-caption text-ink-2">
                  계약 버전{" "}
                  {document.contractRevisionId
                    ? (numbers.get(document.contractRevisionId) ?? "-")
                    : "-"}
                </span>
                {latestByType.get(document.documentType) === document.versionNo ? (
                  <Badge tone="green" className="h-7 min-w-0 px-3 text-caption">
                    최신
                  </Badge>
                ) : null}
                {document.piiMaskingConfirmed ? (
                  <Badge tone="amber" className="h-7 min-w-0 px-3 text-caption">
                    가린 사본
                  </Badge>
                ) : null}
              </div>
              <p className="text-caption text-ink-2">
                작성 {document.writtenDate ? formatSeoulDate(document.writtenDate) : "미확인"} ·
                교부 {document.deliveredDate ? formatSeoulDate(document.deliveredDate) : "미확인"} ·{" "}
                {labelOf(RETENTION_NOTE, document.documentType)}
                {document.retentionEndDate
                  ? ` · 보존 종료일 ${formatSeoulDate(document.retentionEndDate)}`
                  : " · 보존 종료일 미정(날짜 보완 필요)"}
              </p>
              {document.datePendingReason ? (
                <p className="text-caption text-ink-2">
                  날짜 미확인 사유: {document.datePendingReason}
                </p>
              ) : null}
              {document.piiMaskingConfirmed ? (
                <p className="text-caption text-ink-3">{CONTRACT_ENTRY_COPY.maskedCopy}</p>
              ) : null}
              <div className="flex flex-wrap items-start gap-2">
                <DownloadButton contractId={detail.contractId} document={document} />
                {latestByType.get(document.documentType) === document.versionNo ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isReadOnly}
                    aria-label={`${labelOf(DOCUMENT_TYPE_LABEL, document.documentType)} 정정본 올리기`}
                    onClick={() => setDialog({ target: document })}
                  >
                    정정본 올리기
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog ? (
        <UploadDialog detail={detail} target={dialog.target} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}

export function DocumentScreen({ contractId }: { contractId: number }) {
  return (
    <ContractSubScreen
      contractId={contractId}
      active="documents"
      title="서류 첨부"
      description="거래계약서와 중개대상물 확인·설명서를 올리고 보존 기한을 확인합니다."
    >
      {(detail) => <DocumentBody detail={detail} />}
    </ContractSubScreen>
  );
}
