import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DeletionQueueCancelResponseSchema,
  DeletionQueueExcludeResponseSchema,
  DeletionQueueExecuteResponseSchema,
  DeletionQueueVerifyResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { ApiError, apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import { DeletionListSchema, DeletionPreviewSchema } from "./deletion-model";
import type { VerifyKey } from "./deletion-model";

const SCOPE = "deletion-queue";
const BASE = "/api/ops/deletion-queue";
const LOOKUP_SIZE = 100;

export function useDeletionList(params: { page: number; size: number }) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: DeletionListSchema }),
  });
}

/**
 * 목록을 queueId로 걸러 한 건을 찾는다(백엔드 목록 필터). 첫 페이지에서만 찾으면 101번째 이후 건이
 * 404가 된다. 없으면 404로 다룬다.
 */
export function useDeletionItem(queueId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "item", queueId),
    queryFn: async () => {
      const page = await apiFetch(opsPath(BASE, { queueId, page: 0, size: LOOKUP_SIZE }), {
        schema: DeletionListSchema,
      });
      const item = page.items.find((candidate) => candidate.queueId === queueId);
      if (!item) {
        throw new ApiError(404, {
          code: "RESOURCE_NOT_FOUND",
          message: "대상을 찾을 수 없습니다.",
        });
      }
      return item;
    },
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
