import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsVisitReviewDisputeListResponseSchema,
  OpsVisitReviewResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type {
  OpsVisitReviewDisputeDecisionRequest,
  OpsVisitReviewRemoveRequest,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "visit-review-disputes";

export function useDisputeList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/visit-review-disputes", params), {
        schema: OpsVisitReviewDisputeListResponseSchema,
      }),
  });
}

export function useDisputeActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  return {
    decide: useMutation({
      mutationFn: (input: { disputeId: number } & OpsVisitReviewDisputeDecisionRequest) =>
        apiFetch(`/api/ops/visit-review-disputes/${input.disputeId}/decision`, {
          method: "POST",
          body: { decision: input.decision, decisionNote: input.decisionNote },
          schema: OpsVisitReviewResponseSchema,
        }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (input: { reviewId: number } & OpsVisitReviewRemoveRequest) =>
        apiFetch(`/api/ops/visit-reviews/${input.reviewId}/remove`, {
          method: "POST",
          body: { reasonCode: input.reasonCode, decisionNote: input.decisionNote },
          schema: OpsVisitReviewResponseSchema,
        }),
      onSuccess: refresh,
    }),
  };
}
