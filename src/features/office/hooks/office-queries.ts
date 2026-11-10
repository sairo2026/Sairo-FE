"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authContextQueryKey } from "@/shared/session/auth-context-key";
import {
  fetchCurrentOffice,
  fetchCurrentTransfer,
  fetchLatestRegistration,
  fetchMembershipDetail,
  fetchMyMembership,
  fetchTransfer,
  listChangeRequests,
  listMemberships,
  listRoster,
} from "../api/office.api";
import type { MembershipListParams } from "../api/office.api";

export const officeKeys = {
  registration: ["office", "registration"] as const,
  current: ["office", "current"] as const,
  changeRequests: (page: number, size: number) =>
    ["office", "change-requests", page, size] as const,
  myMembership: ["office", "my-membership"] as const,
  memberships: ["office", "memberships"] as const,
  membershipList: (params: MembershipListParams) => ["office", "memberships", params] as const,
  membershipDetail: (id: number) => ["office", "memberships", "detail", id] as const,
  roster: ["office", "roster"] as const,
  rosterPage: (page: number, size: number) => ["office", "roster", page, size] as const,
  transfer: ["office", "transfer"] as const,
  transferStatus: (id: number) => ["office", "transfer", id] as const,
};

export function useLatestRegistration() {
  return useQuery({ queryKey: officeKeys.registration, queryFn: fetchLatestRegistration });
}

export function useCurrentOffice() {
  return useQuery({ queryKey: officeKeys.current, queryFn: fetchCurrentOffice });
}

export function useChangeRequests(page: number, size: number) {
  return useQuery({
    queryKey: officeKeys.changeRequests(page, size),
    queryFn: () => listChangeRequests(page, size),
  });
}

export function useMyMembership() {
  return useQuery({ queryKey: officeKeys.myMembership, queryFn: fetchMyMembership });
}

export function useMemberships(params: MembershipListParams, enabled = true) {
  return useQuery({
    queryKey: officeKeys.membershipList(params),
    queryFn: () => listMemberships(params),
    enabled,
  });
}

export function useMembershipDetail(membershipId: number) {
  return useQuery({
    queryKey: officeKeys.membershipDetail(membershipId),
    queryFn: () => fetchMembershipDetail(membershipId),
  });
}

export function useRoster(page: number, size: number) {
  return useQuery({
    queryKey: officeKeys.rosterPage(page, size),
    queryFn: () => listRoster(page, size),
  });
}

export function useCurrentTransfer() {
  return useQuery({ queryKey: officeKeys.transfer, queryFn: fetchCurrentTransfer });
}

export function useTransferStatus(transferId: number | null) {
  return useQuery({
    queryKey: officeKeys.transferStatus(transferId ?? 0),
    queryFn: () => fetchTransfer(transferId ?? 0),
    enabled: transferId !== null,
  });
}

export function useRefreshOfficeState() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: authContextQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["office"] }),
    ]);
  };
}
