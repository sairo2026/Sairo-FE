import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import {
  EvidenceDownloadUrlResponseSchema,
  OpsOfficeChangeApproveResponseSchema,
  OpsOfficeChangeRejectResponseSchema,
  OpsOfficeRevokeResponseSchema,
  OpsRegistrationApproveResponseSchema,
  OpsRegistrationRejectResponseSchema,
  OpsRegistrationSupplementResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import {
  ChangeRequestListSchema,
  ChecklistResponseSchema,
  RegistrationDetailSchema,
  RegistrationListSchema,
} from "./registration-model";

const SCOPE = "registrations";
const BASE = "/api/ops/office-registrations";

export function useRegistrationList(params: { status: string; page: number; size: number }) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: RegistrationListSchema }),
  });
}

export function useRegistrationDetail(registrationId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "detail", registrationId),
    queryFn: () => apiFetch(`${BASE}/${registrationId}`, { schema: RegistrationDetailSchema }),
  });
}

export function useChangeRequestList(params: { status: string; page: number; size: number }) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "changes", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/office-change-requests", params), {
        schema: ChangeRequestListSchema,
      }),
  });
}

export function useRegistrationActions(registrationId: number) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  const post = <T>(path: string, schema: z.ZodType<T>, body?: unknown) =>
    apiFetch(`${BASE}/${registrationId}/${path}`, { method: "POST", body, schema });

  return {
    saveChecklist: useMutation({
      mutationFn: (items: { itemCode: string; checked: boolean }[]) =>
        apiFetch(`${BASE}/${registrationId}/checklist`, {
          method: "PUT",
          body: { items },
          schema: ChecklistResponseSchema,
        }),
      onSuccess: refresh,
    }),
    approve: useMutation({
      mutationFn: () => post("approve", OpsRegistrationApproveResponseSchema),
      onSuccess: refresh,
    }),
    requestSupplement: useMutation({
      mutationFn: (body: { reason: string; supplementDueAt: string }) =>
        post("request-supplement", OpsRegistrationSupplementResponseSchema, body),
      onSuccess: refresh,
    }),
    reject: useMutation({
      mutationFn: (reason: string) =>
        post("reject", OpsRegistrationRejectResponseSchema, { reason }),
      onSuccess: refresh,
    }),
    evidenceUrl: useMutation({
      mutationFn: (evidenceType: string) =>
        post("evidence/download-url", EvidenceDownloadUrlResponseSchema, { evidenceType }),
    }),
  };
}

export function useOfficeRevoke() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { officeId: number; reason: string }) =>
      apiFetch(`/api/ops/offices/${input.officeId}/revoke`, {
        method: "POST",
        body: { reason: input.reason },
        schema: OpsOfficeRevokeResponseSchema,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}

export function useChangeRequestActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  return {
    approve: useMutation({
      mutationFn: (requestId: number) =>
        apiFetch(`/api/ops/office-change-requests/${requestId}/approve`, {
          method: "POST",
          schema: OpsOfficeChangeApproveResponseSchema,
        }),
      onSuccess: refresh,
    }),
    reject: useMutation({
      mutationFn: (input: { requestId: number; reason: string }) =>
        apiFetch(`/api/ops/office-change-requests/${input.requestId}/reject`, {
          method: "POST",
          body: { reason: input.reason },
          schema: OpsOfficeChangeRejectResponseSchema,
        }),
      onSuccess: refresh,
    }),
  };
}
