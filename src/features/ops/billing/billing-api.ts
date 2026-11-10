import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsBillingInvoiceDetailResponseSchema,
  OpsBillingInvoiceListResponseSchema,
  OpsBillingReconciliationListResponseSchema,
  OpsBillingReconciliationResolveResponseSchema,
  OpsRefundDetailResponseSchema,
  OpsRefundExecuteResponseSchema,
  OpsRefundRequestListResponseSchema,
  OpsRefundReviewResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type {
  OpsBillingReconciliationResolveRequest,
  RefundRequestReviewRequest,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "billing";

export function useInvoiceList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "invoices", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/billing/invoices", params), {
        schema: OpsBillingInvoiceListResponseSchema,
      }),
  });
}

export function useInvoiceDetail(invoiceId: number | null) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "invoice", invoiceId),
    enabled: invoiceId !== null,
    queryFn: () =>
      apiFetch(`/api/ops/billing/invoices/${invoiceId}`, {
        schema: OpsBillingInvoiceDetailResponseSchema,
      }),
  });
}

export function useRefundList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "refunds", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/refund-requests", params), {
        schema: OpsRefundRequestListResponseSchema,
      }),
  });
}

export function useRefundDetail(refundId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "refund", refundId),
    queryFn: () =>
      apiFetch(`/api/ops/refund-requests/${refundId}`, { schema: OpsRefundDetailResponseSchema }),
  });
}

export function useRefundActions(refundId: number) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  return {
    review: useMutation({
      mutationFn: (body: RefundRequestReviewRequest) =>
        apiFetch(`/api/ops/refund-requests/${refundId}/review`, {
          method: "POST",
          body,
          schema: OpsRefundReviewResponseSchema,
        }),
      onSuccess: refresh,
    }),
    execute: useMutation({
      mutationFn: () =>
        apiFetch(`/api/ops/refund-requests/${refundId}/execute`, {
          method: "POST",
          schema: OpsRefundExecuteResponseSchema,
        }),
      onSuccess: refresh,
    }),
  };
}

export function useReconciliationList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "reconciliation", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/billing/reconciliation", params), {
        schema: OpsBillingReconciliationListResponseSchema,
      }),
  });
}

export function useResolveReconciliation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { entryId: number; body: OpsBillingReconciliationResolveRequest }) =>
      apiFetch(`/api/ops/billing/reconciliation/${input.entryId}/resolve`, {
        method: "POST",
        body: input.body,
        schema: OpsBillingReconciliationResolveResponseSchema,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}
