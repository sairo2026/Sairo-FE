import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsPolicyDocumentListResponseSchema,
  OpsPriceScheduleApproveResponseSchema,
  OpsPriceScheduleCreateResponseSchema,
  OpsPriceScheduleListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsPriceScheduleCreateRequest } from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "price-schedules";
const BASE = "/api/ops/price-schedules";

export function usePriceScheduleList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: OpsPriceScheduleListResponseSchema }),
  });
}

export function usePricingPolicyDocuments(enabled: boolean) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "pricing-documents"),
    enabled,
    retry: false,
    queryFn: () =>
      apiFetch(opsPath("/api/ops/policy-documents", { page: 0, size: 100 }), {
        schema: OpsPolicyDocumentListResponseSchema,
      }),
  });
}

export function usePriceScheduleActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "list") });
  return {
    create: useMutation({
      mutationFn: (body: OpsPriceScheduleCreateRequest) =>
        apiFetch(BASE, { method: "POST", body, schema: OpsPriceScheduleCreateResponseSchema }),
      onSuccess: refresh,
    }),
    approve: useMutation({
      mutationFn: (scheduleId: number) =>
        apiFetch(`${BASE}/${scheduleId}/approve`, {
          method: "POST",
          schema: OpsPriceScheduleApproveResponseSchema,
        }),
      onSettled: refresh,
    }),
  };
}
