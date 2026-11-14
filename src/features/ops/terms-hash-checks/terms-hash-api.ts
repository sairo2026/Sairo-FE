import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api/client";
import { opsKeys } from "../api/ops-api";
import { TermsHashListSchema, TermsHashRunSchema } from "./terms-hash-model";

const SCOPE = "terms-hash-checks";

export function useTermsHashChecks() {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE),
    queryFn: () => apiFetch("/api/ops/terms-hash-checks", { schema: TermsHashListSchema }),
    select: (data) => ({ items: data.items, totalElements: data.items.length }),
  });
}

export function useRunTermsHashCheck() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch("/api/ops/terms-hash-checks", { method: "POST", schema: TermsHashRunSchema }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}
