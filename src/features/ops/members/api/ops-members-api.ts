import {
  MemberEmergencySuspendResponseSchema,
  OperatorMemberDetailResponseSchema,
  OperatorMemberListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { MemberEmergencySuspendRequest } from "@/lib/api/contracts/ops.schema";
import { apiFetch } from "@/shared/api/client";
import { opsKeys, opsPath } from "../../api/ops-api";

export type MemberListFilter = { keyword: string; accountStatus: string };

export const opsMemberKeys = {
  list: (filter: MemberListFilter, page: number, size: number) =>
    opsKeys.scope("members", "list", filter, page, size),
  detail: (userId: number) => opsKeys.scope("members", "detail", userId),
};

export function fetchMemberList(filter: MemberListFilter, page: number, size: number) {
  return apiFetch(
    opsPath("/api/ops/members", {
      keyword: filter.keyword.trim(),
      accountStatus: filter.accountStatus,
      page,
      size,
    }),
    { schema: OperatorMemberListResponseSchema },
  );
}

export function fetchMemberDetail(userId: number) {
  return apiFetch(`/api/ops/members/${userId}`, { schema: OperatorMemberDetailResponseSchema });
}

export function emergencySuspendMember(userId: number, request: MemberEmergencySuspendRequest) {
  return apiFetch(`/api/ops/members/${userId}/emergency-suspend`, {
    method: "POST",
    body: request,
    schema: MemberEmergencySuspendResponseSchema,
  });
}
