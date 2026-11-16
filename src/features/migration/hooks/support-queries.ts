"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllowedExportTables, fetchExport, listExports } from "../api/export.api";

export const exportKeys = {
  all: ["migration", "exports"] as const,
  lists: ["migration", "exports", "list"] as const,
  list: (params: object) => ["migration", "exports", "list", params] as const,
  detail: (exportId: number) => ["migration", "exports", "detail", exportId] as const,
  allowedTables: ["migration", "exports", "allowed-tables"] as const,
};

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
