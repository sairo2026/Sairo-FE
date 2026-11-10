import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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

export const INTAKE_LOOKUP_SIZE = 100;

/** 접수 상세 조회 API가 없어 큐 목록에서 같은 번호의 접수를 찾는다. */
export function useIntakeLookup(intakeId: number) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "lookup", intakeId),
    queryFn: async () => {
      const result = await apiFetch(opsPath(BASE, { page: 0, size: INTAKE_LOOKUP_SIZE }), {
        schema: GuestPrivacyIntakeListResponseSchema,
      });
      return result.items.find((item) => item.intakeId === intakeId) ?? null;
    },
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
