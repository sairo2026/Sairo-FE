import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OperatorDisableResponseSchema,
  OperatorEnableResponseSchema,
  OperatorInvitationCancelResponseSchema,
  OperatorInvitationCreateResponseSchema,
  OperatorInvitationListResponseSchema,
  OperatorRoleAssignResponseSchema,
  OpsAuditLogResponseSchema,
  OpsOperatorListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { ifMatch, opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "operators";

export function useOperatorList(params: { page: number; size: number }) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/operators", params), { schema: OpsOperatorListResponseSchema }),
  });
}

export function useOperatorActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) });
  const base = (operatorId: number) => `/api/ops/operators/${operatorId}`;
  return {
    assignRoles: useMutation({
      mutationFn: (input: { operatorId: number; roles: string[] }) =>
        apiFetch(`${base(input.operatorId)}/roles`, {
          method: "POST",
          body: { roles: input.roles },
          schema: OperatorRoleAssignResponseSchema,
        }),
      onSuccess: refresh,
    }),
    disable: useMutation({
      mutationFn: (input: { operatorId: number; reason: string }) =>
        apiFetch(`${base(input.operatorId)}/disable`, {
          method: "POST",
          body: { reason: input.reason },
          schema: OperatorDisableResponseSchema,
        }),
      onSuccess: refresh,
    }),
    enable: useMutation({
      mutationFn: (operatorId: number) =>
        apiFetch(`${base(operatorId)}/enable`, {
          method: "POST",
          schema: OperatorEnableResponseSchema,
        }),
      onSuccess: refresh,
    }),
  };
}

export function useInvitationList(params: { status: string; page: number; size: number }) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "invitations", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/operator-invitations", params), {
        schema: OperatorInvitationListResponseSchema,
      }),
  });
}

export function useInvitationActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE, "invitations") });
  return {
    create: useMutation({
      mutationFn: (body: { inviteeName: string; inviteeEmail: string; roles: string[] }) =>
        apiFetch("/api/ops/operator-invitations", {
          method: "POST",
          body,
          schema: OperatorInvitationCreateResponseSchema,
        }),
      onSuccess: refresh,
    }),
    cancel: useMutation({
      mutationFn: (input: { invitationId: number; version: number }) =>
        apiFetch(`/api/ops/operator-invitations/${input.invitationId}/cancel`, {
          method: "POST",
          headers: ifMatch(input.version),
          schema: OperatorInvitationCancelResponseSchema,
        }),
      onSettled: refresh,
    }),
  };
}

export function useAuditLog(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope("audit-log", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/audit-log", params), { schema: OpsAuditLogResponseSchema }),
  });
}
