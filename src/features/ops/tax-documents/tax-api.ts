import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TaxDocumentListResponseSchema,
  TaxDocumentResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type {
  TaxDocumentAmendRequest,
  TaxDocumentRecordRequest,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "tax-documents";

export function useTaxDocumentList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/billing/tax-documents", params), {
        schema: TaxDocumentListResponseSchema,
      }),
  });
}

export function useTaxDocumentActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  return {
    record: useMutation({
      mutationFn: (input: { invoiceId: number; body: TaxDocumentRecordRequest }) =>
        apiFetch(`/api/ops/billing/invoices/${input.invoiceId}/tax-documents`, {
          method: "POST",
          body: input.body,
          schema: TaxDocumentResponseSchema,
        }),
      onSuccess: refresh,
    }),
    amend: useMutation({
      mutationFn: (input: { documentId: number; body: TaxDocumentAmendRequest }) =>
        apiFetch(`/api/ops/billing/tax-documents/${input.documentId}/amend`, {
          method: "POST",
          body: input.body,
          schema: TaxDocumentResponseSchema,
        }),
      onSuccess: refresh,
    }),
  };
}
