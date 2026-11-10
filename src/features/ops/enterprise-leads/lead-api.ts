import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import {
  EnterpriseLeadQuoteResponseSchema,
  OpsEnterpriseLeadAssignResponseSchema,
  OpsEnterpriseLeadCloseResponseSchema,
  OpsEnterpriseLeadConsultationStartResponseSchema,
  OpsEnterpriseLeadContractResponseSchema,
  OpsEnterpriseLeadDetailResponseSchema,
  OpsEnterpriseLeadListResponseSchema,
  OpsEnterpriseLeadReopenResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OperatorEnterpriseLeadQuoteRequest } from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { ifMatch, opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "enterprise-leads";
const BASE = "/api/ops/enterprise-leads";

export function useLeadList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: OpsEnterpriseLeadListResponseSchema }),
  });
}

export function useLeadDetail(leadId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "detail", leadId),
    queryFn: () => apiFetch(`${BASE}/${leadId}`, { schema: OpsEnterpriseLeadDetailResponseSchema }),
  });
}

export type CloseInput = { closedReason: string; closedNote?: string };
export type ReopenInput = { reason: string; assignedOperatorId?: number };
export type ContractInput = { contractReference: string; contractedAt: string };

export function useLeadActions(leadId: number, version: number) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  const post = <T>(path: string, schema: z.ZodType<T>, body?: unknown) =>
    apiFetch(`${BASE}/${leadId}/${path}`, {
      method: "POST",
      body,
      headers: ifMatch(version),
      schema,
    });
  return {
    assign: useMutation({
      mutationFn: (assignedOperatorId: number) =>
        post("assign", OpsEnterpriseLeadAssignResponseSchema, { assignedOperatorId }),
      onSuccess: refresh,
    }),
    startConsultation: useMutation({
      mutationFn: () =>
        post("consultation-start", OpsEnterpriseLeadConsultationStartResponseSchema),
      onSuccess: refresh,
    }),
    issueQuote: useMutation({
      mutationFn: (body: OperatorEnterpriseLeadQuoteRequest) =>
        post("quote", EnterpriseLeadQuoteResponseSchema, body),
      onSuccess: refresh,
    }),
    contract: useMutation({
      mutationFn: (body: ContractInput) =>
        post("contract", OpsEnterpriseLeadContractResponseSchema, body),
      onSuccess: refresh,
    }),
    close: useMutation({
      mutationFn: (body: CloseInput) => post("close", OpsEnterpriseLeadCloseResponseSchema, body),
      onSuccess: refresh,
    }),
    reopen: useMutation({
      mutationFn: (body: ReopenInput) =>
        post("reopen", OpsEnterpriseLeadReopenResponseSchema, body),
      onSuccess: refresh,
    }),
  };
}
