import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OpsOwnerTransferListResponseSchema,
  OwnerTransferOperatorApproveResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../api/ops-api";
import type { OpsListParams } from "../api/ops-api";

const SCOPE = "owner-transfers";
const BASE = "/api/ops/owner-transfers";

export function useOwnerTransferList(params: OpsListParams) {
  return useQuery({
    queryKey: opsKeys.scope(SCOPE, "list", params),
    queryFn: () => apiFetch(opsPath(BASE, params), { schema: OpsOwnerTransferListResponseSchema }),
  });
}

export function useApproveOwnerTransfer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (transferId: number) =>
      apiFetch(`${BASE}/${transferId}/approve`, {
        method: "POST",
        schema: OwnerTransferOperatorApproveResponseSchema,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: opsKeys.scope(SCOPE) }),
  });
}
