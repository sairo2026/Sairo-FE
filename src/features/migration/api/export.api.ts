import {
  ExportAllowedTablesResponseSchema,
  ExportCreateResponseSchema,
  ExportListResponseSchema,
  ExportResultResponseSchema,
} from "@/lib/api/contracts/migration.schema";
import type { ExportCreateRequest } from "@/lib/api/contracts/migration.schema";
import { apiFetch, withQuery } from "@/shared/api/client";

export function listExports(params: { page: number; size: number }) {
  return apiFetch(withQuery("/api/exports", params), { schema: ExportListResponseSchema });
}

export function fetchAllowedExportTables() {
  return apiFetch("/api/exports/allowed-tables", { schema: ExportAllowedTablesResponseSchema });
}

export function createExport(request: ExportCreateRequest) {
  return apiFetch("/api/exports", {
    method: "POST",
    body: request,
    schema: ExportCreateResponseSchema,
  });
}

export function fetchExport(exportId: number) {
  return apiFetch(`/api/exports/${exportId}`, { schema: ExportResultResponseSchema });
}

export function updateExportPolicy(allowedTables: string[]) {
  return apiFetch("/api/offices/current/export-policy", {
    method: "PUT",
    body: { allowedTables },
    schema: ExportAllowedTablesResponseSchema,
  });
}
