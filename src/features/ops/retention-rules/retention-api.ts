import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api/client";
import { ifMatch, opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";
import {
  KakaoEventListSchema,
  KakaoRetrySchema,
  RetentionListSchema,
  RetentionRuleSchema,
} from "./retention-model";
import type { toRuleBody } from "./retention-model";

const SCOPE = "retention-rules";

export function useRetentionRules() {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "rules"),
    queryFn: () => apiFetch("/api/ops/retention-rules", { schema: RetentionListSchema }),
    select: (data) => ({ items: data.items, totalElements: data.items.length }),
  });
}

export function useUpdateRetentionRule() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      ruleCode: string;
      version: number;
      body: ReturnType<typeof toRuleBody>;
    }) =>
      apiFetch(`/api/ops/retention-rules/${encodeURIComponent(input.ruleCode)}`, {
        method: "PUT",
        body: input.body,
        headers: ifMatch(input.version),
        schema: RetentionRuleSchema,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "rules") }),
  });
}

export function useKakaoEvents(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "kakao", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/kakao-unlink-events", params), { schema: KakaoEventListSchema }),
  });
}

export function useRetryKakaoEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (eventId: number) =>
      apiFetch(`/api/ops/kakao-unlink-events/${eventId}/retry`, {
        method: "POST",
        schema: KakaoRetrySchema,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "kakao") }),
  });
}
