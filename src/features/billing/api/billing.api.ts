import {
  AuthStatusResponseSchema,
  BillingInvoiceListResponseSchema,
  BillingKeyRegisterResponseSchema,
  BillingKeySessionResponseSchema,
  BillingPlanListResponseSchema,
  GrantAuthResponseSchema,
  PriceChangeNoticeDeclineResponseSchema,
  PriceChangeNoticeListResponseSchema,
  PurchaseConsentPreviewResponseSchema,
  RefundRequestCreateResponseSchema,
  RefundRequestListResponseSchema,
  StartCustomerAgreementResponseSchema,
  SubscriptionCancelResponseSchema,
  SubscriptionCancelWithdrawResponseSchema,
  SubscriptionPurchaseConsentResponseSchema,
} from "@/lib/api/contracts/billing.schema";
import type {
  BillingKeyRegisterRequest,
  GrantAuthRequest,
  RefundRequestCreateRequest,
  SubscriptionPurchaseConsentRequest,
  TaxRecipientUpsertRequest,
} from "@/lib/api/contracts/billing.schema";
import { fetchLegalCompanyInfo } from "@/shared/legal/use-legal-values";
import { TermsCatalogResponseSchema } from "@/lib/api/contracts/auth.schema";
import { z } from "zod";
import { apiFetch, withQuery } from "@/shared/api/client";
import {
  ArchiveGrantStatusWireSchema,
  ExportWireSchema,
  InvoiceDetailWireSchema,
  PublicPricingWireSchema,
  RefundStatusWireSchema,
  SubscriptionWireSchema,
  ReturnGrantStatusWireSchema,
  TaxRecipientWireSchema,
} from "./wire";

export const KAKAO_GRANT_START_PATH = "/api/auth/kakao/start?purpose=GRANT";

const PUBLIC_REQUEST = { skipAuthEvents: true } as const;
const GRANT_REQUEST = { skipAuthEvents: true, skipStepUp: true } as const;

export function fetchPublicPricing() {
  return apiFetch("/api/public/pricing", { schema: PublicPricingWireSchema, ...PUBLIC_REQUEST });
}

export const fetchPublicCompanyInfo = fetchLegalCompanyInfo;

const OfficeNameSchema = z.object({ name: z.string() });

export function fetchOfficeName() {
  return apiFetch("/api/offices/current", { schema: OfficeNameSchema });
}

export function fetchBillingPlans() {
  return apiFetch("/api/billing/plans", { schema: BillingPlanListResponseSchema });
}

export function fetchSubscription() {
  return apiFetch("/api/subscriptions/current", { schema: SubscriptionWireSchema });
}

export function fetchCardNotice() {
  return apiFetch(withQuery("/api/terms", { context: "CARD_REGISTRATION" }), {
    schema: TermsCatalogResponseSchema,
  });
}

export function openBillingKeySession() {
  return apiFetch("/api/subscriptions/billing-key/session", {
    method: "POST",
    schema: BillingKeySessionResponseSchema,
  });
}

export function registerBillingKey(request: BillingKeyRegisterRequest) {
  return apiFetch("/api/subscriptions/billing-key", {
    method: "POST",
    body: request,
    schema: BillingKeyRegisterResponseSchema,
  });
}

export function deleteBillingKey() {
  return apiFetch("/api/subscriptions/billing-key", { method: "DELETE" });
}

export function fetchConsentPreview(params: { plan?: string; priceChangeNoticeId?: number }) {
  return apiFetch(withQuery("/api/subscriptions/purchase-consent/preview", { ...params }), {
    schema: PurchaseConsentPreviewResponseSchema,
  });
}

export function submitPurchaseConsent(request: SubscriptionPurchaseConsentRequest) {
  return apiFetch("/api/subscriptions/purchase-consent", {
    method: "POST",
    body: request,
    schema: SubscriptionPurchaseConsentResponseSchema,
  });
}

export function requestFirstPayment() {
  return apiFetch("/api/subscriptions/first-payment", { method: "POST" });
}

export function requestRetryPayment() {
  return apiFetch("/api/subscriptions/retry-payment", { method: "POST" });
}

export function cancelSubscription() {
  return apiFetch("/api/subscriptions/cancel", {
    method: "POST",
    schema: SubscriptionCancelResponseSchema,
  });
}

export function withdrawCancellation() {
  return apiFetch("/api/subscriptions/cancel/withdraw", {
    method: "POST",
    schema: SubscriptionCancelWithdrawResponseSchema,
  });
}

export type PageParams = { page: number; size: number };

export function listInvoices(params: PageParams) {
  return apiFetch(withQuery("/api/billing/invoices", { ...params }), {
    schema: BillingInvoiceListResponseSchema,
  });
}

export function fetchInvoice(invoiceId: number) {
  return apiFetch(`/api/billing/invoices/${invoiceId}`, { schema: InvoiceDetailWireSchema });
}

export function createRefundRequest(request: RefundRequestCreateRequest) {
  return apiFetch("/api/refund-requests", {
    method: "POST",
    body: request,
    schema: RefundRequestCreateResponseSchema,
  });
}

export function listRefundRequests(params: PageParams & { invoiceId?: number; status?: string }) {
  return apiFetch(withQuery("/api/refund-requests", { ...params }), {
    schema: RefundRequestListResponseSchema,
  });
}

export function fetchRefundRequest(refundId: number) {
  return apiFetch(`/api/refund-requests/${refundId}`, { schema: RefundStatusWireSchema });
}

export function fetchStartCustomerAgreement() {
  return apiFetch("/api/subscriptions/start-customer-agreement", {
    schema: StartCustomerAgreementResponseSchema,
  });
}

export function acknowledgeStartCustomerAgreement() {
  return apiFetch("/api/subscriptions/start-customer-agreement/acknowledge", {
    method: "POST",
    schema: StartCustomerAgreementResponseSchema,
  });
}

export function listPriceChangeNotices(params: PageParams) {
  return apiFetch(withQuery("/api/subscriptions/price-change-notices", { ...params }), {
    schema: PriceChangeNoticeListResponseSchema,
  });
}

export function declinePriceChangeNotice(noticeId: number) {
  return apiFetch(`/api/subscriptions/price-change-notices/${noticeId}/decline`, {
    method: "POST",
    schema: PriceChangeNoticeDeclineResponseSchema,
  });
}

export function fetchTaxRecipient() {
  return apiFetch("/api/billing/tax-recipient", { schema: TaxRecipientWireSchema });
}

export function saveTaxRecipient(request: TaxRecipientUpsertRequest) {
  return apiFetch("/api/billing/tax-recipient", {
    method: "PUT",
    body: request,
    schema: TaxRecipientWireSchema,
  });
}

export function fetchAuthStatus() {
  return apiFetch("/api/offices/current/auth-status", { schema: AuthStatusResponseSchema });
}

export function authenticateGrant(kind: "return" | "archive", request: GrantAuthRequest) {
  return apiFetch(`/api/grant-auth/${kind}`, {
    method: "POST",
    body: request,
    schema: GrantAuthResponseSchema,
    ...GRANT_REQUEST,
  });
}

export function fetchReturnGrant() {
  return apiFetch("/api/return-grants/current", {
    schema: ReturnGrantStatusWireSchema,
    ...GRANT_REQUEST,
  });
}

export function createReturnExport(grantId: number) {
  return apiFetch(`/api/return-grants/${grantId}/export`, {
    method: "POST",
    schema: ExportWireSchema,
    ...GRANT_REQUEST,
  });
}

export function fetchReturnExport(grantId: number, exportId: number) {
  return apiFetch(`/api/return-grants/${grantId}/exports/${exportId}`, {
    schema: ExportWireSchema,
    ...GRANT_REQUEST,
  });
}

export function createArchiveExport(grantId: number) {
  return apiFetch(`/api/archive-grants/${grantId}/documents/export`, {
    method: "POST",
    schema: ExportWireSchema,
    ...GRANT_REQUEST,
  });
}

export function fetchArchiveExport(grantId: number, exportId: number) {
  return apiFetch(`/api/archive-grants/${grantId}/documents/exports/${exportId}`, {
    schema: ExportWireSchema,
    ...GRANT_REQUEST,
  });
}

export function fetchArchiveGrant() {
  return apiFetch("/api/archive-grants/current", {
    schema: ArchiveGrantStatusWireSchema,
    ...GRANT_REQUEST,
  });
}
