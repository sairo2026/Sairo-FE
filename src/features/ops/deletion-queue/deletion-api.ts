import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DeletionQueueCancelResponseSchema,
  DeletionQueueDetailResponseSchema,
  DeletionQueueExcludeResponseSchema,
  DeletionQueueExecuteResponseSchema,
  DeletionQueueVerifyResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import { DeletionListSchema, DeletionPreviewSchema } from "./deletion-model";
import type { VerifyKey } from "./deletion-model";

const SCOPE = "deletion-queue";
const BASE = "/api/ops/deletion-queue";

export function useDeletionList(params: { page: number; size: number; targetType?: string }) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: DeletionListSchema }),
  });
}

export function useDeletionItem(queueId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "item", queueId),
    queryFn: () => apiFetch(`${BASE}/${queueId}`, { schema: DeletionQueueDetailResponseSchema }),
  });
}

export function useDeletionPreview(queueId: number, enabled: boolean) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "preview", queueId),
    queryFn: () => apiFetch(`${BASE}/${queueId}/preview`, { schema: DeletionPreviewSchema }),
    enabled,
    staleTime: 0,
    gcTime: 0,
  });
}

export type VerifyBody = Record<VerifyKey, string> & {
  backupExpiresAt: string | null;
  evidence: string;
};

export type ExcludeBody = {
  exclusionReason: string;
  holdExpiresAt: string;
  exclusionReviewedAt: string;
  approvedByOperatorId: number;
};

export function useDeletionActions(queueId: number) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  const path = (suffix: string) => `${BASE}/${queueId}/${suffix}`;
  return {
    exclude: useMutation({
      mutationFn: (body: ExcludeBody) =>
        apiFetch(path("exclude"), {
          method: "POST",
          body,
          schema: DeletionQueueExcludeResponseSchema,
        }),
      onSuccess: refresh,
    }),
    cancel: useMutation({
      mutationFn: (reason: string) =>
        apiFetch(path("cancel"), {
          method: "POST",
          body: { reason },
          schema: DeletionQueueCancelResponseSchema,
        }),
      onSettled: refresh,
    }),
    execute: useMutation({
      mutationFn: () =>
        apiFetch(path("execute"), { method: "POST", schema: DeletionQueueExecuteResponseSchema }),
      onSettled: refresh,
    }),
    verify: useMutation({
      mutationFn: (body: VerifyBody) =>
        apiFetch(path("verify"), {
          method: "POST",
          body,
          schema: DeletionQueueVerifyResponseSchema,
        }),
      onSettled: refresh,
    }),
  };
}
