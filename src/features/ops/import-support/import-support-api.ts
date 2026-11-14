import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import {
  OpsImportSupportDeliverResponseSchema,
  OpsImportSupportExecuteResponseSchema,
  OpsImportSupportMappingResponseSchema,
  OpsImportSupportQuoteResponseSchema,
  OpsImportSupportRejectResponseSchema,
  OpsImportSupportStartResponseSchema,
  OpsImportSupportSubmitReviewResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { ifMatch, opsKeys, opsPath } from "../api/ops-api";
import { ImportSupportDetailSchema, ImportSupportListSchema } from "./import-support-model";

const SCOPE = "import-support";
const BASE = "/api/ops/import-support-requests";
const POLL_MS = 5000;

export function useImportSupportList(params: {
  status: string;
  assignedToMe: string;
  page: number;
  size: number;
}) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: ImportSupportListSchema }),
  });
}

export function useImportSupportDetail(requestId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "detail", requestId),
    queryFn: () => apiFetch(`${BASE}/${requestId}`, { schema: ImportSupportDetailSchema }),
    refetchInterval: (query) => (query.state.data?.batchStatus === "EXECUTING" ? POLL_MS : false),
  });
}

export type MappingInput = {
  sourceSystem: string;
  targetType: string;
  mappings: { sourceColumn: string; targetField: string }[];
};

export function useImportSupportActions(requestId: number, version: number) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  const headers = ifMatch(version);
  const path = (suffix: string) => `${BASE}/${requestId}/${suffix}`;
  const post = <T>(suffix: string, schema: z.ZodType<T>, body?: unknown) =>
    apiFetch(path(suffix), { method: "POST", body, schema, headers });

  return {
    quote: useMutation({
      mutationFn: (body: { quoteAmount: number; scopeNote: string | null }) =>
        post("quote", OpsImportSupportQuoteResponseSchema, body),
      onSettled: refresh,
    }),
    reject: useMutation({
      mutationFn: (reason: string) =>
        post("reject", OpsImportSupportRejectResponseSchema, { reason }),
      onSettled: refresh,
    }),
    start: useMutation({
      mutationFn: () => post("start", OpsImportSupportStartResponseSchema),
      onSettled: refresh,
    }),
    saveMapping: useMutation({
      mutationFn: (body: MappingInput) =>
        apiFetch(path("mapping"), {
          method: "PUT",
          body,
          schema: OpsImportSupportMappingResponseSchema,
          headers,
        }),
      onSettled: refresh,
    }),
    submitReview: useMutation({
      mutationFn: () => post("submit-review", OpsImportSupportSubmitReviewResponseSchema),
      onSettled: refresh,
    }),
    execute: useMutation({
      mutationFn: () => post("execute", OpsImportSupportExecuteResponseSchema),
      onSettled: refresh,
    }),
    deliver: useMutation({
      mutationFn: () => post("deliver", OpsImportSupportDeliverResponseSchema),
      onSettled: refresh,
    }),
  };
}
