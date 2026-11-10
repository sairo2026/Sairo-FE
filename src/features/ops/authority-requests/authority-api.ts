import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";
import { AuthorityListSchema, AuthorityRecordSchema } from "./authority-model";
import type { toAuthorityCreateBody, toCloseBody } from "./authority-model";

const SCOPE = "authority-requests";

export function useAuthorityRequests(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/authority-requests", params), { schema: AuthorityListSchema }),
  });
}

export function useCreateAuthorityRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ReturnType<typeof toAuthorityCreateBody>) =>
      apiFetch("/api/ops/authority-requests", {
        method: "POST",
        body,
        schema: AuthorityRecordSchema,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}

export function useCloseAuthorityRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: number; body: ReturnType<typeof toCloseBody> }) =>
      apiFetch(`/api/ops/authority-requests/${input.requestId}/close`, {
        method: "POST",
        body: input.body,
        schema: AuthorityRecordSchema,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}
