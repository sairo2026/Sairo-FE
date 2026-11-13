import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GuestPrivacyIntakeDetailResponseSchema,
  GuestPrivacyIntakeListResponseSchema,
  GuestPrivacyIntakeResolveResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { GuestPrivacyIntakeResolveRequest } from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "guest-privacy-intakes";
const BASE = "/api/ops/guest-privacy-intakes";

export function useIntakeList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () =>
      apiFetch(opsPath(BASE, params), { schema: GuestPrivacyIntakeListResponseSchema }),
  });
}

export function useIntake(intakeId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "detail", intakeId),
    queryFn: () =>
      apiFetch(`${BASE}/${intakeId}`, { schema: GuestPrivacyIntakeDetailResponseSchema }),
  });
}

export function useResolveIntake(intakeId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: GuestPrivacyIntakeResolveRequest) =>
      apiFetch(`${BASE}/${intakeId}/resolve`, {
        method: "POST",
        body,
        schema: GuestPrivacyIntakeResolveResponseSchema,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}
