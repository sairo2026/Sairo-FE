"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchAuthStatus,
  fetchBillingPlans,
  fetchCardNotice,
  fetchConsentPreview,
  fetchInvoice,
  fetchOfficeName,
  fetchPublicCompanyInfo,
  fetchPublicPricing,
  fetchRefundRequest,
  fetchStartCustomerAgreement,
  fetchSubscription,
  fetchTaxRecipient,
  listInvoices,
  listPriceChangeNotices,
  listRefundRequests,
} from "../api/billing.api";
import type { PageParams } from "../api/billing.api";

export const billingKeys = {
  all: ["billing"] as const,
  publicPricing: ["billing", "public-pricing"] as const,
  companyInfo: ["billing", "company-info"] as const,
  plans: ["billing", "plans"] as const,
  subscription: ["billing", "subscription"] as const,
  cardNotice: ["billing", "card-notice"] as const,
  consentPreview: (plan?: string, noticeId?: number) =>
    ["billing", "consent-preview", plan ?? "", noticeId ?? 0] as const,
  invoices: (params: PageParams) => ["billing", "invoices", params] as const,
  invoice: (invoiceId: number) => ["billing", "invoice", invoiceId] as const,
  refunds: (params: object) => ["billing", "refunds", params] as const,
  refund: (refundId: number) => ["billing", "refund", refundId] as const,
  agreement: ["billing", "agreement"] as const,
  notices: (params: PageParams) => ["billing", "notices", params] as const,
  taxRecipient: ["billing", "tax-recipient"] as const,
  authStatus: ["billing", "auth-status"] as const,
  noticesAll: ["billing", "notices"] as const,
  officeName: ["billing", "office-name"] as const,
  returnGrant: ["billing", "return-grant"] as const,
  archiveGrant: ["billing", "archive-grant"] as const,
  returnExport: (grantId: number, exportId: number | null) =>
    ["billing", "return-export", grantId, exportId] as const,
  archiveExport: (grantId: number, exportId: number | null) =>
    ["billing", "archive-export", grantId, exportId] as const,
};

export function usePublicPricing() {
  return useQuery({ queryKey: billingKeys.publicPricing, queryFn: fetchPublicPricing });
}

export function useCompanyInfo() {
  return useQuery({
    queryKey: billingKeys.companyInfo,
    queryFn: fetchPublicCompanyInfo,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useBillingPlans() {
  return useQuery({ queryKey: billingKeys.plans, queryFn: fetchBillingPlans });
}

export function useSubscription(enabled = true) {
  return useQuery({ queryKey: billingKeys.subscription, queryFn: fetchSubscription, enabled });
}

export function useCardNotice() {
  return useQuery({ queryKey: billingKeys.cardNotice, queryFn: fetchCardNotice });
}

export function useConsentPreview(plan?: string, noticeId?: number) {
  return useQuery({
    queryKey: billingKeys.consentPreview(plan, noticeId),
    queryFn: () => fetchConsentPreview({ plan, priceChangeNoticeId: noticeId }),
    gcTime: 0,
  });
}

export function useInvoices(params: PageParams) {
  return useQuery({ queryKey: billingKeys.invoices(params), queryFn: () => listInvoices(params) });
}

export function useInvoice(invoiceId: number) {
  return useQuery({
    queryKey: billingKeys.invoice(invoiceId),
    queryFn: () => fetchInvoice(invoiceId),
  });
}

export function useRefunds(params: PageParams & { invoiceId?: number }) {
  return useQuery({
    queryKey: billingKeys.refunds(params),
    queryFn: () => listRefundRequests(params),
  });
}

export function useRefund(refundId: number) {
  return useQuery({
    queryKey: billingKeys.refund(refundId),
    queryFn: () => fetchRefundRequest(refundId),
  });
}

export function useStartAgreement() {
  return useQuery({ queryKey: billingKeys.agreement, queryFn: fetchStartCustomerAgreement });
}

export function usePriceNotices(params: PageParams) {
  return useQuery({
    queryKey: billingKeys.notices(params),
    queryFn: () => listPriceChangeNotices(params),
  });
}

export function useTaxRecipient() {
  return useQuery({ queryKey: billingKeys.taxRecipient, queryFn: fetchTaxRecipient });
}

export function useAuthStatus() {
  return useQuery({ queryKey: billingKeys.authStatus, queryFn: fetchAuthStatus });
}

export function useOfficeName() {
  return useQuery({
    queryKey: billingKeys.officeName,
    queryFn: fetchOfficeName,
    retry: false,
    staleTime: 5 * 60_000,
    select: (office) => office.name,
  });
}
