import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsPriceChangeNoticeCreateResponseSchema,
  OpsPriceChangeNoticeListResponseSchema,
  OpsPriceScheduleListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "price-changes";

export function usePriceSchedules() {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "schedules"),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/price-schedules", { page: 0, size: 100 }), {
        schema: OpsPriceScheduleListResponseSchema,
      }),
  });
}

export function usePriceNotices(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "notices", params),
    queryFn: () =>
      apiFetch(opsPath("/api/ops/price-change-notices", params), {
        schema: OpsPriceChangeNoticeListResponseSchema,
      }),
  });
}

export function useCreatePriceNotices() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { scheduleId: number; officeIds: number[] | null }) =>
      apiFetch(`/api/ops/price-schedules/${input.scheduleId}/notices`, {
        method: "POST",
        body: { officeIds: input.officeIds },
        schema: OpsPriceChangeNoticeCreateResponseSchema,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}
