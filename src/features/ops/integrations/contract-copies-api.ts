import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api/client";
import { opsKeys } from "../api/ops-api";
import { ContractCopyCreatedSchema, ContractCopyListSchema } from "./contract-copies-model";
import type { toCopyBody } from "./contract-copies-model";

const SCOPE = "contract-copies";

export function useContractCopies(integrationId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, integrationId),
    queryFn: () =>
      apiFetch(`/api/ops/integrations/${integrationId}/contract-copies`, {
        schema: ContractCopyListSchema,
      }),
  });
}

export function useCreateContractCopy(integrationId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ReturnType<typeof toCopyBody>) =>
      apiFetch(`/api/ops/integrations/${integrationId}/contract-copies`, {
        method: "POST",
        body,
        schema: ContractCopyCreatedSchema,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, integrationId) }),
  });
}
