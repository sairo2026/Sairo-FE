"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchCurrentOffice,
  fetchCurrentTerms,
  fetchLoginHistory,
  fetchOfficeMemberships,
  fetchSubscriptionSummary,
  fetchTermsHistory,
} from "../api/settings.api";

export const settingsKeys = {
  loginHistory: (params: object) => ["settings", "login-history", params] as const,
  termsHistory: (params: object) => ["auth", "terms-history", params] as const,
  currentTerms: ["settings", "current-terms"] as const,
  office: ["settings", "office"] as const,
};

export function useLoginHistory(params: { page: number; size: number }) {
  return useQuery({
    queryKey: settingsKeys.loginHistory(params),
    queryFn: () => fetchLoginHistory(params),
  });
}

export function useTermsHistory(params: { page: number; size: number }) {
  return useQuery({
    queryKey: settingsKeys.termsHistory(params),
    queryFn: () => fetchTermsHistory(params),
  });
}

export function useCurrentTerms() {
  return useQuery({ queryKey: settingsKeys.currentTerms, queryFn: fetchCurrentTerms });
}

export function useCurrentOffice(enabled: boolean) {
  return useQuery({ queryKey: settingsKeys.office, queryFn: fetchCurrentOffice, enabled });
}

export function useOfficeMemberships() {
  return useQuery({
    queryKey: ["settings", "office-memberships"] as const,
    queryFn: fetchOfficeMemberships,
  });
}

export function useSubscriptionSummary() {
  return useQuery({
    queryKey: ["settings", "subscription-summary"] as const,
    queryFn: fetchSubscriptionSummary,
  });
}
