"use client";

import { useQuery } from "@tanstack/react-query";
import { OfficeMembershipListResponseSchema } from "@/lib/api/contracts/office.schema";
import { apiFetch, withQuery } from "@/shared/api/client";

export type AssignableMember = { membershipId: number; displayName: string };

const ASSIGNABLE_ROLES: readonly string[] = ["OWNER", "AGENT"];

export const assignableMembersKey = ["office", "assignable-members"] as const;

async function fetchAssignableMembers(): Promise<AssignableMember[]> {
  const response = await apiFetch(
    withQuery("/api/offices/current/memberships", { status: "APPROVED", page: 0, size: 100 }),
    { schema: OfficeMembershipListResponseSchema },
  );
  return response.items
    .filter((item) => ASSIGNABLE_ROLES.includes(item.role))
    .map((item) => ({ membershipId: item.membershipId, displayName: item.displayName }));
}

/** 담당 공인중개사로 지정할 수 있는 승인된 대표와 소속공인중개사. */
export function useAssignableMembers() {
  return useQuery({ queryKey: assignableMembersKey, queryFn: fetchAssignableMembers });
}
