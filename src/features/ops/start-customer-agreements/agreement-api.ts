import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsStartCustomerAgreementApproveResponseSchema,
  OpsStartCustomerAgreementCreateResponseSchema,
  OpsStartCustomerAgreementListResponseSchema,
  OpsStartCustomerAgreementRevokeResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsStartCustomerAgreementCreateRequest } from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { ifMatch, opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "start-customer-agreements";
const BASE = "/api/ops/start-customer-agreements";

export function useAgreementList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () =>
      apiFetch(opsPath(BASE, params), { schema: OpsStartCustomerAgreementListResponseSchema }),
  });
}

export function useAgreementActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  return {
    create: useMutation({
      mutationFn: (body: OpsStartCustomerAgreementCreateRequest) =>
        apiFetch(BASE, {
          method: "POST",
          body,
          schema: OpsStartCustomerAgreementCreateResponseSchema,
        }),
      onSuccess: refresh,
    }),
    approve: useMutation({
      mutationFn: (input: { agreementId: number; version: number }) =>
        apiFetch(`${BASE}/${input.agreementId}/approve`, {
          method: "POST",
          headers: ifMatch(input.version),
          schema: OpsStartCustomerAgreementApproveResponseSchema,
        }),
      onSettled: refresh,
    }),
    revoke: useMutation({
      mutationFn: (input: { agreementId: number; reason: string }) =>
        apiFetch(`${BASE}/${input.agreementId}/revoke`, {
          method: "POST",
          body: { reason: input.reason },
          schema: OpsStartCustomerAgreementRevokeResponseSchema,
        }),
      onSuccess: refresh,
    }),
  };
}
