import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsAnnouncementCreateResponseSchema,
  OpsAnnouncementEndResponseSchema,
  OpsAnnouncementListResponseSchema,
  OpsAnnouncementPreviewResponseSchema,
  OpsAnnouncementPublishResponseSchema,
  OpsAnnouncementRevisionResponseSchema,
  OpsAnnouncementSubmitReviewResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsAnnouncementCreateRequest } from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "announcements";
const BASE = "/api/ops/announcements";

export function useAnnouncementList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: OpsAnnouncementListResponseSchema }),
  });
}

export function useAnnouncementPreview(announcementId: number | null) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "preview", announcementId),
    enabled: announcementId !== null,
    gcTime: 0,
    retry: false,
    queryFn: () =>
      apiFetch(`${BASE}/${announcementId}/preview`, {
        schema: OpsAnnouncementPreviewResponseSchema,
      }),
  });
}

export function useAnnouncementActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "list") });
  return {
    create: useMutation({
      mutationFn: (body: OpsAnnouncementCreateRequest) =>
        apiFetch(BASE, { method: "POST", body, schema: OpsAnnouncementCreateResponseSchema }),
      onSuccess: refresh,
    }),
    submitReview: useMutation({
      mutationFn: (announcementId: number) =>
        apiFetch(`${BASE}/${announcementId}/submit-review`, {
          method: "POST",
          schema: OpsAnnouncementSubmitReviewResponseSchema,
        }),
      onSettled: refresh,
    }),
    publish: useMutation({
      mutationFn: (input: { announcementId: number; scheduledAt: string | null }) =>
        apiFetch(`${BASE}/${input.announcementId}/publish`, {
          method: "POST",
          body: { scheduledAt: input.scheduledAt },
          schema: OpsAnnouncementPublishResponseSchema,
        }),
      onSettled: refresh,
    }),
    end: useMutation({
      mutationFn: (announcementId: number) =>
        apiFetch(`${BASE}/${announcementId}/end`, {
          method: "POST",
          schema: OpsAnnouncementEndResponseSchema,
        }),
      onSettled: refresh,
    }),
    revise: useMutation({
      mutationFn: (input: { announcementId: number; body: OpsAnnouncementCreateRequest }) =>
        apiFetch(`${BASE}/${input.announcementId}/revisions`, {
          method: "POST",
          body: input.body,
          schema: OpsAnnouncementRevisionResponseSchema,
        }),
      onSettled: refresh,
    }),
  };
}
