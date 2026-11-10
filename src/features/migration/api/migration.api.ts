import {
  ImportBatchListResponseSchema,
  ImportBatchStatusResponseSchema,
  ImportCancelResponseSchema,
  ImportExecuteResponseSchema,
  ImportMappingConfirmResponseSchema,
  ImportMappingSuggestionResponseSchema,
  ImportRetryFailedResponseSchema,
  ImportSheetSelectResponseSchema,
} from "@/lib/api/contracts/migration.schema";
import type { ImportMappingConfirmRequest } from "@/lib/api/contracts/migration.schema";
import { apiFetch, withQuery } from "@/shared/api/client";
import { BatchDetailWireSchema, PreviewWireSchema } from "./wire";

export type PageParams = { page: number; size: number };

export function listImportBatches() {
  return apiFetch("/api/import-batches", { schema: ImportBatchListResponseSchema });
}

export function uploadImportFile(request: { file: File; targetType: string }) {
  const form = new FormData();
  form.append("file", request.file);
  form.append("targetType", request.targetType);
  return apiFetch("/api/import-batches", {
    method: "POST",
    body: form,
    schema: ImportBatchStatusResponseSchema,
  });
}

export function fetchImportBatch(batchId: number) {
  return apiFetch(`/api/import-batches/${batchId}`, { schema: BatchDetailWireSchema });
}

export function selectImportSheet(request: {
  batchId: number;
  sheetName: string;
  version: number;
}) {
  return apiFetch(`/api/import-batches/${request.batchId}/sheet`, {
    method: "PUT",
    headers: { "If-Match": String(request.version) },
    body: { sheetName: request.sheetName },
    schema: ImportSheetSelectResponseSchema,
  });
}

export function fetchMappingSuggestion(batchId: number) {
  return apiFetch(`/api/import-batches/${batchId}/mapping-suggestion`, {
    schema: ImportMappingSuggestionResponseSchema,
  });
}

export function confirmImportMapping(request: {
  batchId: number;
  body: ImportMappingConfirmRequest;
}) {
  return apiFetch(`/api/import-batches/${request.batchId}/mapping`, {
    method: "PUT",
    body: request.body,
    schema: ImportMappingConfirmResponseSchema,
  });
}

export function fetchImportPreview(request: { batchId: number } & PageParams) {
  return apiFetch(
    withQuery(`/api/import-batches/${request.batchId}/preview`, {
      page: request.page,
      size: request.size,
    }),
    { schema: PreviewWireSchema },
  );
}

export function executeImport(batchId: number) {
  return apiFetch(`/api/import-batches/${batchId}/execute`, {
    method: "POST",
    schema: ImportExecuteResponseSchema,
  });
}

export function cancelImport(batchId: number) {
  return apiFetch(`/api/import-batches/${batchId}/cancel`, {
    method: "POST",
    schema: ImportCancelResponseSchema,
  });
}

export function retryFailedImport(batchId: number) {
  return apiFetch(`/api/import-batches/${batchId}/retry-failed`, {
    method: "POST",
    schema: ImportRetryFailedResponseSchema,
  });
}
