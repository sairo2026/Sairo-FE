import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsPolicyDocumentCreateResponseSchema,
  OpsPolicyDocumentListResponseSchema,
  OpsPolicyDocumentPublishResponseSchema,
  OpsPolicyDocumentSubmitReviewResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsPolicyDocumentCreateRequest } from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "policy-documents";
const BASE = "/api/ops/policy-documents";

export function usePolicyList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: OpsPolicyDocumentListResponseSchema }),
  });
}

export function usePolicyActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  return {
    create: useMutation({
      mutationFn: (body: OpsPolicyDocumentCreateRequest) =>
        apiFetch(BASE, { method: "POST", body, schema: OpsPolicyDocumentCreateResponseSchema }),
      onSuccess: refresh,
    }),
    submitReview: useMutation({
      mutationFn: (documentId: number) =>
        apiFetch(`${BASE}/${documentId}/submit-review`, {
          method: "POST",
          schema: OpsPolicyDocumentSubmitReviewResponseSchema,
        }),
      onSettled: refresh,
    }),
    publish: useMutation({
      mutationFn: (documentId: number) =>
        apiFetch(`${BASE}/${documentId}/publish`, {
          method: "POST",
          schema: OpsPolicyDocumentPublishResponseSchema,
        }),
      onSettled: refresh,
    }),
  };
}
