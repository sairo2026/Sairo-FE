import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";
import {
  IntegrationCheckSchema,
  IntegrationListSchema,
  IntegrationUpdateSchema,
} from "./integrations-model";
import type { toIntegrationPatchBody } from "./integrations-model";

const SCOPE = "integrations";

/** 환경은 서버 필터로 보낸다. 받은 한 페이지 안에서 거르면 전체 건수와 페이지가 어긋난다. */
export function useIntegrations(params: OpsListParams, environment: string) {
  const query = { ...params, environment: environment === "" ? undefined : environment };
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", query),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/integrations", query), { schema: IntegrationListSchema }),
  });
}

export function useCheckIntegration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: number) =>
      apiFetch(`/api/ops/integrations/${integrationId}/check`, {
        method: "POST",
        schema: IntegrationCheckSchema,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}

export function useUpdateIntegration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      integrationId: number;
      body: ReturnType<typeof toIntegrationPatchBody>;
    }) =>
      apiFetch(`/api/ops/integrations/${input.integrationId}`, {
        method: "PATCH",
        body: input.body,
        schema: IntegrationUpdateSchema,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}
