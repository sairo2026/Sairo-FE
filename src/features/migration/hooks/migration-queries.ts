"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchImportBatch,
  fetchImportPreview,
  fetchMappingSuggestion,
  listImportBatches,
} from "../api/migration.api";
import type { PageParams } from "../api/migration.api";

export const migrationKeys = {
  batches: ["migration", "batches"] as const,
  sheets: (batchId: number) => ["migration", "sheets", batchId] as const,
  batch: (batchId: number) => ["migration", "batch", batchId] as const,
  suggestion: (batchId: number) => ["migration", "suggestion", batchId] as const,
  previewAll: (batchId: number) => ["migration", "preview", batchId] as const,
  preview: (batchId: number, params: PageParams) =>
    ["migration", "preview", batchId, params] as const,
};

export function useImportBatches() {
  return useQuery({ queryKey: migrationKeys.batches, queryFn: listImportBatches });
}

const POLL_INTERVAL_MS = 2000;

export function useImportBatch(batchId: number) {
  return useQuery({
    queryKey: migrationKeys.batch(batchId),
    queryFn: () => fetchImportBatch(batchId),
    refetchInterval: (query) =>
      query.state.data?.status === "EXECUTING" ? POLL_INTERVAL_MS : false,
  });
}

export function useMappingSuggestion(batchId: number, enabled: boolean) {
  return useQuery({
    queryKey: migrationKeys.suggestion(batchId),
    queryFn: () => fetchMappingSuggestion(batchId),
    enabled,
  });
}

export function useImportPreview(batchId: number, params: PageParams, enabled: boolean) {
  return useQuery({
    queryKey: migrationKeys.preview(batchId, params),
    queryFn: () => fetchImportPreview({ batchId, ...params }),
    enabled,
  });
}
