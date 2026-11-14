"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchApproverLinkStatus,
  fetchAssistantCustomer,
  fetchCoordination,
  listAccessApprovals,
  listCoordinations,
  listReceivedGrants,
} from "../api/visit.api";
import type { VisitListParams } from "../api/visit.api";

export const visitKeys = {
  all: ["visit"] as const,
  list: (params: VisitListParams) => ["visit", "list", params] as const,
  detail: (coordinationId: number) => ["visit", "detail", coordinationId] as const,
  assistantCustomer: (customerId: number) => ["visit", "assistant-customer", customerId] as const,
  grants: (keyword: string) => ["visit", "received-grants", keyword] as const,
  approvals: (propertyId: number) => ["visit", "approvals", propertyId] as const,
  approverLink: (propertyId: number, approvalId: number) =>
    ["visit", "approver-link", propertyId, approvalId] as const,
};

export function useCoordinationList(params: VisitListParams) {
  return useQuery({ queryKey: visitKeys.list(params), queryFn: () => listCoordinations(params) });
}

export function useCoordinationDetail(coordinationId: number) {
  return useQuery({
    queryKey: visitKeys.detail(coordinationId),
    queryFn: () => fetchCoordination(coordinationId),
  });
}

export function useAssistantCustomer(customerId: number, enabled: boolean) {
  return useQuery({
    queryKey: visitKeys.assistantCustomer(customerId),
    queryFn: () => fetchAssistantCustomer(customerId),
    enabled,
  });
}

export function useReceivedGrants(keyword: string) {
  return useQuery({
    queryKey: visitKeys.grants(keyword),
    queryFn: () => listReceivedGrants({ keyword: keyword || undefined, page: 0, size: 50 }),
  });
}

export function useAccessApprovals(propertyId: number) {
  return useQuery({
    queryKey: visitKeys.approvals(propertyId),
    queryFn: () => listAccessApprovals(propertyId),
  });
}

export function useApproverLinkStatus(propertyId: number, approvalId: number, enabled: boolean) {
  return useQuery({
    queryKey: visitKeys.approverLink(propertyId, approvalId),
    queryFn: () => fetchApproverLinkStatus(propertyId, approvalId),
    enabled,
  });
}
