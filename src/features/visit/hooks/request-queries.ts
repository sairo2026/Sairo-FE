"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchCoordinationForChange,
  listApplyGrants,
  listCrossOfficeRequests,
  listCrossOfficeSchedules,
  listRequestNotices,
  listVisitRequests,
} from "../api/request.api";
import type { CrossOfficeParams } from "../api/request.api";

export const requestKeys = {
  requests: (coordinationId: number) => ["visit", "requests", coordinationId] as const,
  notices: ["visit", "notices"] as const,
  change: (coordinationId: number, itemId: number) =>
    ["visit", "change-slots", coordinationId, itemId] as const,
  applyGrants: (propertyId: number, approvalId: number) =>
    ["visit", "apply-grants", propertyId, approvalId] as const,
  crossRequests: (propertyId: number, params: CrossOfficeParams) =>
    ["visit", "cross-requests", propertyId, params] as const,
  crossSchedules: (propertyId: number, params: CrossOfficeParams) =>
    ["visit", "cross-schedules", propertyId, params] as const,
};

export function useVisitRequests(coordinationId: number) {
  return useQuery({
    queryKey: requestKeys.requests(coordinationId),
    queryFn: () => listVisitRequests(coordinationId),
  });
}

export function useRequestNotices() {
  return useQuery({ queryKey: requestKeys.notices, queryFn: listRequestNotices });
}

export function useChangeSlots(coordinationId: number, itemId: number, enabled: boolean) {
  return useQuery({
    queryKey: requestKeys.change(coordinationId, itemId),
    queryFn: () => fetchCoordinationForChange(coordinationId, itemId),
    enabled,
  });
}

export function useApplyGrants(propertyId: number, approvalId: number) {
  return useQuery({
    queryKey: requestKeys.applyGrants(propertyId, approvalId),
    queryFn: () => listApplyGrants(propertyId, approvalId),
  });
}

export function useCrossOfficeRequests(propertyId: number, params: CrossOfficeParams) {
  return useQuery({
    queryKey: requestKeys.crossRequests(propertyId, params),
    queryFn: () => listCrossOfficeRequests(propertyId, params),
  });
}

export function useCrossOfficeSchedules(propertyId: number, params: CrossOfficeParams) {
  return useQuery({
    queryKey: requestKeys.crossSchedules(propertyId, params),
    queryFn: () => listCrossOfficeSchedules(propertyId, params),
  });
}
