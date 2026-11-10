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

export function useIntegrations(params: OpsListParams, environment: string) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/integrations", params), { schema: IntegrationListSchema }),
    select: (data) => ({
      ...data,
      items: data.items.filter((row) => environment === "" || row.environment === environment),
    }),
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
