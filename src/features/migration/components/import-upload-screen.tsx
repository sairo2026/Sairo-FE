"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ImportBatchListResponse } from "@/lib/api/contracts/migration.schema";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { StatusBadge, TextLink } from "@/shared/components/feedback/page-parts";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { DataMigrationUploadNotice } from "@/shared/legal/data-rights-notices";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { uploadImportFile } from "../api/migration.api";
import { migrationKeys, useImportBatches } from "../hooks/migration-queries";
import {
  BATCH_STATUS,
  IMPORT_ACCEPTED_EXTENSIONS,
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MONTHLY_LIMIT,
  SUPPORT_STATUS,
  TARGET_TYPES,
  isActiveSupportLink,
  targetTypeLabel,
} from "../model/labels";
import { IMPORT_COPY, describeMigrationError } from "../model/messages";

type Item = ImportBatchListResponse["items"][number];

function validateFile(file: File | null): string | undefined {
  if (!file) return IMPORT_COPY.fileRequired;
  const lower = file.name.toLowerCase();
  if (!IMPORT_ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return IMPORT_COPY.extension;
  }
  if (file.size > IMPORT_MAX_FILE_BYTES) return IMPORT_COPY.tooLarge;
  return undefined;
}

function UploadForm({ remaining }: { remaining: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [targetType, setTargetType] = useState("");
  const [fileError, setFileError] = useState<string>();
  const [targetError, setTargetError] = useState<string>();
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: uploadImportFile,
    onSuccess: async (batch) => {
      queryClient.setQueryData(migrationKeys.sheets(batch.batchId), batch);
      await queryClient.invalidateQueries({ queryKey: migrationKeys.batches });
      router.push(`/import/${batch.batchId}`);
    },
    onError: (caught) => setError(describeMigrationError(caught, "파일을 올리지 못했습니다.")),
  });

  function submit() {
    const nextFileError = validateFile(file);
    const nextTargetError = targetType === "" ? IMPORT_COPY.targetRequired : undefined;
    setFileError(nextFileError);
    setTargetError(nextTargetError);
    setError(undefined);
    if (nextFileError || nextTargetError || !file) return;
    mutation.mutate({ file, targetType });
  }

  return (
    <Card title="파일 올리기">
      <div className="flex flex-col gap-5">
        <p className="text-caption text-ink-2" role="status">
          {IMPORT_COPY.quota(remaining, IMPORT_MONTHLY_LIMIT)}
        </p>
        {remaining <= 0 ? <FormNotice>{IMPORT_COPY.quotaExhausted}</FormNotice> : null}
        <SelectField
          label="이전할 자료"
          value={targetType}
          placeholder="자료 종류를 선택해 주세요"
          options={TARGET_TYPES.map((item) => ({ value: item.value, label: item.label }))}
          onValueChange={(value) => {
            setTargetType(value);
            setTargetError(undefined);
          }}
          error={targetError}
          disabled={isReadOnly}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="import-file" className="text-caption font-semibold text-ink">
            파일 (XLS, XLSX, CSV · 최대 20MB)
          </label>
          <input
            ref={inputRef}
            id="import-file"
            type="file"
            accept={IMPORT_ACCEPTED_EXTENSIONS.join(",")}
            disabled={isReadOnly}
            aria-invalid={fileError ? true : undefined}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setFileError(undefined);
            }}
            className="text-caption text-ink"
          />
          {fileError ? (
            <p role="alert" className="text-caption text-danger">
              {fileError}
            </p>
          ) : null}
        </div>
        {error ? <FormAlert>{error}</FormAlert> : null}
        {isReadOnly ? (
          <p className="text-caption text-ink-2">
            결제가 지연되어 읽기만 가능한 동안에는 파일을 올릴 수 없습니다.
          </p>
        ) : null}
        <div>
          <Button isLoading={mutation.isPending} disabled={isReadOnly} onClick={submit}>
            올리고 매핑하러 가기
          </Button>
        </div>
      </div>
    </Card>
  );
}

function BatchStatusBadge({ status }: { status: string }) {
  const label = BATCH_STATUS[status];
  return <StatusBadge tone={label?.tone ?? "gray"} label={label?.label ?? status} />;
}

function SupportLink({ item }: { item: Item }) {
  if (item.supportRequestId === null || item.supportRequestId === undefined) {
    return item.eligibleForSupport ? (
      <TextLink href={`/import/support?batchId=${item.batchId}`}>지원 신청</TextLink>
    ) : (
      <>-</>
    );
  }
  const status = item.supportRequestStatus ?? "";
  const label = SUPPORT_STATUS[status]?.label ?? status;
  return (
    <Link
      href={`/import/support/${item.supportRequestId}`}
      className="font-semibold text-primary hover:underline"
    >
      {label}
      {isActiveSupportLink(status) ? " (직접 작업 불가)" : ""}
    </Link>
  );
}

function History({ items }: { items: Item[] }) {
  if (items.length === 0) return <EmptyState title={IMPORT_COPY.historyEmpty} />;
  return (
    <div className="overflow-x-auto rounded-control border border-line">
      <table className="w-full min-w-[40rem] border-collapse text-left text-caption">
        <caption className="sr-only">{IMPORT_COPY.historyTitle}</caption>
        <thead className="bg-surface">
          <tr>
            {["파일", "종류", "상태", "올린 시각", "유료 지원"].map((column) => (
              <th key={column} scope="col" className="px-3 py-2 font-semibold text-ink">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.batchId} className="border-t border-line align-top">
              <td className="px-3 py-2">
                <Link
                  href={`/import/${item.batchId}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {item.fileName}
                </Link>
              </td>
              <td className="px-3 py-2 text-ink-2">{targetTypeLabel(item.targetType)}</td>
              <td className="px-3 py-2">
                <BatchStatusBadge status={item.status} />
              </td>
              <td className="px-3 py-2 text-ink-2">{formatSeoulDateTime(item.createdAt)}</td>
              <td className="px-3 py-2 text-ink-2">
                <SupportLink item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ImportUploadScreen() {
  const { role } = useOfficeAccess();
  const query = useImportBatches();
  if (role !== "OWNER") return <ErrorScreen kind="forbidden" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={IMPORT_COPY.uploadTitle}
        description={IMPORT_COPY.uploadDescription}
        actions={
          <>
            <TextLink href="/import/support">유료 이전 지원</TextLink>
            <TextLink href="/exports">데이터 내보내기</TextLink>
          </>
        }
      />
      <DataMigrationUploadNotice />
      <QueryGate query={query} loadingLabel="이전 이력을 불러오는 중입니다.">
        {(data) => (
          <>
            <UploadForm remaining={data.remainingThisMonth} />
            <Card title={IMPORT_COPY.historyTitle}>
              <History items={data.items} />
            </Card>
          </>
        )}
      </QueryGate>
    </div>
  );
}
