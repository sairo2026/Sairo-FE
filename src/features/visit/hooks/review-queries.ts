"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchApproverProfile,
  fetchApproverReviews,
  fetchPortalApprovals,
  fetchPreferredBrokers,
  fetchTrustSummary,
  listReceivedReviews,
} from "../api/review.api";
import type { ReviewScope } from "../api/review.api";

export const reviewKeys = {
  reviews: (base: string) => ["visit", "review", base, "reviews"] as const,
  preferred: (base: string) => ["visit", "review", base, "preferred"] as const,
  trust: ["visit", "review", "trust"] as const,
  received: (scope: ReviewScope, page: number, size: number) =>
    ["visit", "review", "received", scope, page, size] as const,
  receivedAll: ["visit", "review", "received"] as const,
  portal: ["visit", "review", "portal"] as const,
  profile: ["visit", "review", "profile"] as const,
};

export function useApproverReviews(base: string, enabled = true) {
  return useQuery({
    queryKey: reviewKeys.reviews(base),
    queryFn: ({ signal }) => fetchApproverReviews(base, signal),
    enabled,
    retry: false,
  });
}

export function usePreferredBrokers(base: string, enabled = true) {
  return useQuery({
    queryKey: reviewKeys.preferred(base),
    queryFn: ({ signal }) => fetchPreferredBrokers(base, signal),
    enabled,
    retry: false,
  });
}

export function useTrustSummary(enabled = true) {
  return useQuery({ queryKey: reviewKeys.trust, queryFn: fetchTrustSummary, enabled });
}

export function useReceivedReviews(scope: ReviewScope, page: number, size: number) {
  return useQuery({
    queryKey: reviewKeys.received(scope, page, size),
    queryFn: () => listReceivedReviews({ scope, page, size }),
  });
}

export function usePortalApprovals() {
  return useQuery({
    queryKey: reviewKeys.portal,
    queryFn: ({ signal }) => fetchPortalApprovals(signal),
    retry: false,
  });
}

export function useApproverProfile() {
  return useQuery({
    queryKey: reviewKeys.profile,
    queryFn: ({ signal }) => fetchApproverProfile(signal),
    retry: false,
  });
}
