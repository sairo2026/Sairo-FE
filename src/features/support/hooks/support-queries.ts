"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAccountAgreements, accountQueryKey } from "@/shared/consent/consent.api";
import {
  fetchInquiry,
  fetchPolicyDocuments,
  fetchPrivacyRequest,
  listMyInquiries,
  listMyPrivacyRequests,
} from "../api/support.api";

export const supportKeys = {
  all: ["support"] as const,
  inquiries: (params: object) => ["support", "inquiries", params] as const,
  inquiry: (inquiryId: number) => ["support", "inquiry", inquiryId] as const,
  policies: ["support", "policy-documents"] as const,
  privacyRequests: (params: object) => ["support", "privacy-requests", params] as const,
  privacyRequest: (requestId: number) => ["support", "privacy-request", requestId] as const,
};

export function useMyInquiries(params: { page: number; size: number }) {
  return useQuery({
    queryKey: supportKeys.inquiries(params),
    queryFn: () => listMyInquiries(params),
  });
}

export function useInquiry(inquiryId: number) {
  return useQuery({
    queryKey: supportKeys.inquiry(inquiryId),
    queryFn: () => fetchInquiry(inquiryId),
  });
}

export function usePolicyDocuments() {
  return useQuery({ queryKey: supportKeys.policies, queryFn: fetchPolicyDocuments });
}

export function useAccountAgreements() {
  return useQuery({ queryKey: accountQueryKey, queryFn: fetchAccountAgreements });
}

export function useMyPrivacyRequests(params: { page: number; size: number; status?: string }) {
  return useQuery({
    queryKey: supportKeys.privacyRequests(params),
    queryFn: () => listMyPrivacyRequests(params),
  });
}

export function usePrivacyRequest(requestId: number) {
  return useQuery({
    queryKey: supportKeys.privacyRequest(requestId),
    queryFn: () => fetchPrivacyRequest(requestId),
  });
}
