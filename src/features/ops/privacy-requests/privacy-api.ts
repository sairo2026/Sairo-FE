import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsArchiveGrantTransferResponseSchema,
  OpsPrivacyRequestProcessResponseSchema,
  OpsReturnGrantTransferResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { ifMatch, opsKeys, opsPath } from "../api/ops-api";
import {
  ArchiveGrantListSchema,
  PrivacyDetailSchema,
  PrivacyListSchema,
  ReturnGrantListSchema,
} from "./privacy-model";
import type { ProcessAction } from "./privacy-model";

const SCOPE = "privacy";

export function usePrivacyList(params: {
  status: string;
  requestType: string;
  page: number;
  size: number;
}) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/privacy-requests", params), { schema: PrivacyListSchema }),
  });
}

export function usePrivacyDetail(requestId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "detail", requestId),
    queryFn: () =>
      apiFetch(`/api/ops/privacy-requests/${requestId}`, { schema: PrivacyDetailSchema }),
  });
}

export function usePrivacyProcess(requestId: number, version: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      action: ProcessAction;
      note: string | null;
      evidenceReference: string | null;
    }) =>
      apiFetch(`/api/ops/privacy-requests/${requestId}/process`, {
        method: "POST",
        body,
        schema: OpsPrivacyRequestProcessResponseSchema,
        headers: ifMatch(version),
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}

export function useReturnGrants(params: { page: number; size: number }) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "return-grants", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/return-grants", params), { schema: ReturnGrantListSchema }),
  });
}

export function useArchiveGrants(params: { page: number; size: number }) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "archive-grants", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/archive-grants", params), { schema: ArchiveGrantListSchema }),
  });
}

export type TransferBody = {
  newGranteeUserId: number;
  identityEvidenceReference: string;
  registrationRelationReference: string;
  contractReference?: string;
  reason: string;
};

export function useGrantTransfer(kind: "return" | "archive") {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { grantId: number; body: TransferBody }) => {
      const path = `/api/ops/${kind}-grants/${input.grantId}/transfer`;
      const result =
        kind === "return"
          ? await apiFetch(path, {
              method: "POST",
              body: input.body,
              schema: OpsReturnGrantTransferResponseSchema,
            })
          : await apiFetch(path, {
              method: "POST",
              body: input.body,
              schema: OpsArchiveGrantTransferResponseSchema,
            });
      return { previousGrantId: result.previousGrantId, newGrantId: result.newGrantId };
    },
    onSuccess: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}
