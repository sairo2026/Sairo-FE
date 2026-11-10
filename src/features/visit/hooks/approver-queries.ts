"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchApproverConditions,
  fetchApproverConfirmed,
  fetchApproverRequests,
  fetchProxyConditionHistory,
} from "../api/approver.api";

export const approverKeys = {
  all: ["visit", "approver"] as const,
  conditions: (base: string) => ["visit", "approver", base, "conditions"] as const,
  requests: (base: string) => ["visit", "approver", base, "requests"] as const,
  confirmed: (base: string) => ["visit", "approver", base, "confirmed"] as const,
  history: (propertyId: number, approvalId: number) =>
    ["visit", "approver", "history", propertyId, approvalId] as const,
};

export function useApproverConditions(base: string, enabled = true) {
  return useQuery({
    queryKey: approverKeys.conditions(base),
    queryFn: ({ signal }) => fetchApproverConditions(base, signal),
    enabled,
    retry: false,
  });
}

export function useApproverRequests(base: string, enabled = true) {
  return useQuery({
    queryKey: approverKeys.requests(base),
    queryFn: ({ signal }) => fetchApproverRequests(base, signal),
    enabled,
    retry: false,
  });
}

export function useApproverConfirmed(base: string, enabled = true) {
  return useQuery({
    queryKey: approverKeys.confirmed(base),
    queryFn: ({ signal }) => fetchApproverConfirmed(base, signal),
    enabled,
    retry: false,
  });
}

export function useProxyConditionHistory(propertyId: number, approvalId: number) {
  return useQuery({
    queryKey: approverKeys.history(propertyId, approvalId),
    queryFn: () => fetchProxyConditionHistory(propertyId, approvalId),
  });
}
