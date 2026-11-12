"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ImportBatchStatusResponse } from "@/lib/api/contracts/migration.schema";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { StatusBadge, TextLink } from "@/shared/components/feedback/page-parts";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { DataMigrationUploadNotice } from "@/shared/legal/data-rights-notices";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { selectImportSheet } from "../api/migration.api";
import type { ImportBatchDetail } from "../api/wire";
import { migrationKeys, useImportBatch, useImportBatches } from "../hooks/migration-queries";
import {
  BATCH_STATUS,
  EDITABLE_BATCH_STATUSES,
  isActiveSupportLink,
  targetTypeLabel,
} from "../model/labels";
import { IMPORT_COPY, describeMigrationError } from "../model/messages";
import { MappingPanel } from "./mapping-panel";
import { PreviewPanel } from "./preview-panel";
import { ResultPanel } from "./result-panel";

function SheetSelector({ batch, isLocked }: { batch: ImportBatchDetail; isLocked: boolean }) {
  const queryClient = useQueryClient();
  const sheetsQuery = useQuery<ImportBatchStatusResponse | undefined>({
    queryKey: migrationKeys.sheets(batch.batchId),
    queryFn: () => undefined,
    enabled: false,
  });
  const [error, setError] = useState<string>();
  const upload =
    batch.sheets && batch.sheets.length > 0
      ? { sheets: batch.sheets, selectedSheetName: batch.selectedSheetName ?? "" }
      : sheetsQuery.data;

  const mutation = useMutation({
    mutationFn: selectImportSheet,
    onSuccess: async (result) => {
      setError(undefined);
      queryClient.setQueryData(migrationKeys.sheets(batch.batchId), result);
      await queryClient.invalidateQueries({ queryKey: migrationKeys.batch(batch.batchId) });
      await queryClient.invalidateQueries({ queryKey: migrationKeys.suggestion(batch.batchId) });
      await queryClient.invalidateQueries({ queryKey: migrationKeys.previewAll(batch.batchId) });
    },
    onError: (caught) => setError(describeMigrationError(caught, "시트를 바꾸지 못했습니다.")),
  });

  if (!upload || upload.sheets.length <= 1) return null;
  return (
    <div className="flex flex-col gap-2">
      <SelectField
        label={IMPORT_COPY.sheetLabel}
        value={upload.selectedSheetName}
        options={upload.sheets.map((sheet) => ({
          value: sheet.name,
          label: `${sheet.name} (${sheet.rowCount}행)`,
        }))}
        disabled={isLocked || mutation.isPending}
        onValueChange={(sheetName) =>
          mutation.mutate({ batchId: batch.batchId, sheetName, version: batch.version })
        }
      />
      {error ? <FormAlert>{error}</FormAlert> : null}
    </div>
  );
}

function Body({ batch }: { batch: ImportBatchDetail }) {
  const { isReadOnly } = useOfficeAccess();
  const list = useImportBatches();
  const linked = list.data?.items.find((item) => item.batchId === batch.batchId);
  const isManaged = isActiveSupportLink(linked?.supportRequestStatus);
  const isLocked = isReadOnly || isManaged;
  const status = BATCH_STATUS[batch.status];
  const isEditable = EDITABLE_BATCH_STATUSES.includes(batch.status);
  const hasMapping = batch.status === "MAPPING" || batch.status === "PREVIEW";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={batch.fileName}
        description={`${targetTypeLabel(batch.targetType)} 자료 이전`}
        actions={
          <>
            <StatusBadge tone={status?.tone ?? "gray"} label={status?.label ?? batch.status} />
            <TextLink href="/import">이전 이력</TextLink>
          </>
        }
      />
      <DataMigrationUploadNotice />
      {isManaged && linked?.supportRequestId ? (
        <FormNotice>
          {IMPORT_COPY.managedBySupport}{" "}
          <TextLink href={`/import/support/${linked.supportRequestId}`}>신청 보기</TextLink>
        </FormNotice>
      ) : null}
      {isReadOnly ? (
        <FormNotice>
          결제가 지연되어 읽기만 가능합니다. 대표가 결제를 마치면 다시 진행할 수 있습니다.
        </FormNotice>
      ) : null}
      {isEditable ? (
        <Card title="이전할 시트">
          <SheetSelector batch={batch} isLocked={isLocked} />
          <p className="text-caption text-ink-2">
            {batch.rowCount !== null && batch.rowCount !== undefined
              ? `${batch.rowCount}행을 이전 대상으로 읽었습니다.`
              : "시트를 읽는 중입니다."}
          </p>
        </Card>
      ) : null}
      {isEditable ? (
        <MappingPanel batchId={batch.batchId} version={batch.version} isLocked={isLocked} />
      ) : null}
      {hasMapping ? <PreviewPanel batchId={batch.batchId} isLocked={isLocked} /> : null}
      {!isEditable ? <ResultPanel batch={batch} isLocked={isLocked} /> : null}
    </div>
  );
}

export function ImportBatchScreen({ batchId }: { batchId: number }) {
  const { role } = useOfficeAccess();
  const query = useImportBatch(batchId);
  if (role !== "OWNER") return <ErrorScreen kind="forbidden" />;
  return (
    <QueryGate query={query} loadingLabel="이전 정보를 불러오는 중입니다.">
      {(batch) => <Body batch={batch} />}
    </QueryGate>
  );
}
