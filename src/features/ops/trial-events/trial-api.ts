import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsTrialEventApproveResponseSchema,
  OpsTrialEventCreateResponseSchema,
  OpsTrialEventListResponseSchema,
  OpsTrialEventPreviewResponseSchema,
  OpsTrialEventStopResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsTrialEventCreateRequest } from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "trial-events";
const BASE = "/api/ops/trial-events";

export function useTrialList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: OpsTrialEventListResponseSchema }),
  });
}

export function useTrialPreview(eventId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "preview", eventId),
    gcTime: 0,
    retry: false,
    queryFn: () =>
      apiFetch(`${BASE}/${eventId}/preview`, { schema: OpsTrialEventPreviewResponseSchema }),
  });
}

export function useTrialActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "list") });
  return {
    create: useMutation({
      mutationFn: (body: OpsTrialEventCreateRequest) =>
        apiFetch(BASE, { method: "POST", body, schema: OpsTrialEventCreateResponseSchema }),
      onSuccess: refresh,
    }),
    approve: useMutation({
      mutationFn: (eventId: number) =>
        apiFetch(`${BASE}/${eventId}/approve`, {
          method: "POST",
          schema: OpsTrialEventApproveResponseSchema,
        }),
      onSettled: refresh,
    }),
    stop: useMutation({
      mutationFn: (eventId: number) =>
        apiFetch(`${BASE}/${eventId}/stop`, {
          method: "POST",
          schema: OpsTrialEventStopResponseSchema,
        }),
      onSettled: refresh,
    }),
  };
}
