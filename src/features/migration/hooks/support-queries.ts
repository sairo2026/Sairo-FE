"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllowedExportTables, fetchExport, listExports } from "../api/export.api";
import { fetchImportSupportRequest, listImportSupportRequests } from "../api/support-request.api";

export const supportRequestKeys = {
  all: ["migration", "support-requests"] as const,
  list: (params: object) => ["migration", "support-requests", "list", params] as const,
  detail: (requestId: number) => ["migration", "support-requests", "detail", requestId] as const,
};

export const exportKeys = {
  all: ["migration", "exports"] as const,
  list: (params: object) => ["migration", "exports", "list", params] as const,
  detail: (exportId: number) => ["migration", "exports", "detail", exportId] as const,
  allowedTables: ["migration", "exports", "allowed-tables"] as const,
};

export function useImportSupportRequests(params: { page: number; size: number; status?: string }) {
  return useQuery({
    queryKey: supportRequestKeys.list(params),
    queryFn: () => listImportSupportRequests(params),
  });
}

export function useImportSupportRequest(requestId: number) {
  return useQuery({
    queryKey: supportRequestKeys.detail(requestId),
    queryFn: () => fetchImportSupportRequest(requestId),
  });
}

export function useExports(params: { page: number; size: number }) {
  return useQuery({ queryKey: exportKeys.list(params), queryFn: () => listExports(params) });
}

export function useAllowedExportTables() {
  return useQuery({ queryKey: exportKeys.allowedTables, queryFn: fetchAllowedExportTables });
}

const POLL_INTERVAL_MS = 2000;

export function useExportStatus(exportId: number | null) {
  return useQuery({
    queryKey: exportKeys.detail(exportId ?? 0),
    queryFn: () => fetchExport(exportId ?? 0),
    enabled: exportId !== null,
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING" || query.state.data?.status === "PROCESSING"
        ? POLL_INTERVAL_MS
        : false,
  });
}
