"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ImportBatchListResponse } from "@/lib/api/contracts/migration.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { StatusBadge } from "@/shared/components/feedback/page-parts";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { FileField } from "@/shared/components/ui/file-field";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { DataMigrationUploadNotice } from "@/shared/legal/data-rights-notices";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { uploadImportFile } from "../api/migration.api";
import { ImportGuide } from "./import-guide";
import { migrationKeys, useImportBatches } from "../hooks/migration-queries";
import {
  BATCH_STATUS,
  IMPORT_ACCEPTED_EXTENSIONS,
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MONTHLY_LIMIT,
  TARGET_TYPES,
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
  if (file.size === 0) return IMPORT_COPY.emptyFile;
  if (file.size > IMPORT_MAX_FILE_BYTES) return IMPORT_COPY.tooLarge;
  return undefined;
}

function UploadForm({ remaining }: { remaining: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
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
    <section aria-labelledby="import-upload-title" className="flex max-w-[1075px] flex-col gap-6">
      <h2 id="import-upload-title" className="text-h3 font-semibold text-ink">
        파일 올리기
      </h2>
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
      <ImportGuide targetType={targetType} />
      <FileField
        id="import-file"
        label="파일 (XLS, XLSX, CSV · 최대 20MB)"
        hint={<span role="status">{IMPORT_COPY.quota(remaining, IMPORT_MONTHLY_LIMIT)}</span>}
        accept={IMPORT_ACCEPTED_EXTENSIONS.join(",")}
        file={file}
        onFileChange={(next) => {
          setFile(next);
          setFileError(undefined);
        }}
        disabled={isReadOnly}
        error={fileError}
      />
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
    </section>
  );
}

function BatchStatusBadge({ status }: { status: string }) {
  const label = BATCH_STATUS[status];
  return <StatusBadge tone={label?.tone ?? "gray"} label={label?.label ?? status} />;
}

function History({ items }: { items: Item[] }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const rows = items.slice((page - 1) * size, page * size);
  return (
    <DataTable
      caption={IMPORT_COPY.historyTitle}
      rows={rows}
      getRowId={(row) => String(row.batchId)}
      getRowHref={(row) => `/import/${row.batchId}`}
      totalCount={items.length}
      page={page}
      pageSize={size}
      onPageChange={setPage}
      onPageSizeChange={(next) => {
        setSize(next);
        setPage(1);
      }}
      emptyMessage={IMPORT_COPY.historyEmpty}
      columns={[
        {
          key: "file",
          header: "파일",
          truncate: true,
          render: (row) => (
            <Link
              href={`/import/${row.batchId}`}
              className="font-semibold text-ink hover:text-primary hover:underline"
            >
              {row.fileName}
            </Link>
          ),
        },
        { key: "type", header: "종류", render: (row) => targetTypeLabel(row.targetType) },
        {
          key: "status",
          header: "상태",
          render: (row) => <BatchStatusBadge status={row.status} />,
        },
        {
          key: "createdAt",
          header: "올린 시각",
          render: (row) => formatSeoulDateTime(row.createdAt),
        },
      ]}
    />
  );
}

export function ImportUploadScreen() {
  const { role } = useOfficeAccess();
  const query = useImportBatches();
  if (role !== "OWNER") return <ErrorScreen kind="forbidden" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={IMPORT_COPY.uploadTitle} description={IMPORT_COPY.uploadDescription} />
      <DataMigrationUploadNotice />
      <QueryGate query={query} loadingLabel="이전 이력을 불러오는 중입니다.">
        {(data) => (
          <>
            <UploadForm remaining={data.remainingThisMonth} />
            <section aria-labelledby="import-history-title" className="flex flex-col gap-4">
              <h2 id="import-history-title" className="text-h3 font-semibold text-ink">
                {IMPORT_COPY.historyTitle}
              </h2>
              <History items={data.items} />
            </section>
          </>
        )}
      </QueryGate>
    </div>
  );
}
