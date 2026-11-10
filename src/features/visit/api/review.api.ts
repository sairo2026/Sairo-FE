import {
  ApproverConditionBulkApplyResponseSchema,
  ApproverConditionBulkPreviewResponseSchema,
  ApproverLinkDecisionResponseSchema,
  ApproverPortalApprovalListResponseSchema,
  ApproverPreferredBrokerListResponseSchema,
  ApproverPreferredBrokerResponseSchema,
  ApproverProfileCloseResponseSchema,
  ApproverProfileResponseSchema,
  ApproverSessionResponseSchema,
  ApproverOtpSendResponseSchema,
  ApproverVisitReviewListResponseSchema,
  ApproverVisitReviewResponseSchema,
  BrokerReceivedVisitReviewListResponseSchema,
  BrokerVisitTrustSummaryResponseSchema,
  VisitReviewDisputeResponseSchema,
} from "@/lib/api/contracts/visit.schema";
import type {
  ApproverConditionBulkApplyRequest,
  ApproverConditionBulkPreviewRequest,
  ApproverOtpSendRequest,
  ApproverOtpVerifyRequest,
  ApproverPreferredBrokerCreateRequest,
  ApproverVisitReviewUpsertRequest,
  VisitReviewDisputeCreateRequest,
} from "@/lib/api/contracts/visit.schema";
import { apiFetch, withQuery } from "@/shared/api/client";

const GUEST = { skipAuthEvents: true } as const;
const PORTAL = { skipAuthEvents: true, skipStepUp: true } as const;

export function portalApprovalBase(approvalId: number): string {
  return `/api/approver-portal/approvals/${approvalId}`;
}

export function fetchApproverReviews(base: string, signal?: AbortSignal) {
  return apiFetch(`${base}/visit-reviews`, {
    ...GUEST,
    signal,
    retry: false,
    schema: ApproverVisitReviewListResponseSchema,
  });
}

export function saveApproverReview(
  base: string,
  scheduleItemId: number,
  request: ApproverVisitReviewUpsertRequest,
  version: number | null | undefined,
) {
  return apiFetch(`${base}/visit-reviews/${scheduleItemId}`, {
    ...GUEST,
    method: "PUT",
    body: request,
    headers:
      version === null || version === undefined ? undefined : { "If-Match": String(version) },
    schema: ApproverVisitReviewResponseSchema,
  });
}

export function withdrawApproverReview(base: string, scheduleItemId: number, version: number) {
  return apiFetch(`${base}/visit-reviews/${scheduleItemId}/withdraw`, {
    ...GUEST,
    method: "POST",
    headers: { "If-Match": String(version) },
    schema: ApproverVisitReviewResponseSchema,
  });
}

export function fetchPreferredBrokers(base: string, signal?: AbortSignal) {
  return apiFetch(`${base}/preferred-brokers`, {
    ...GUEST,
    signal,
    retry: false,
    schema: ApproverPreferredBrokerListResponseSchema,
  });
}

export function designatePreferredBroker(
  base: string,
  request: ApproverPreferredBrokerCreateRequest,
) {
  return apiFetch(`${base}/preferred-brokers`, {
    ...GUEST,
    method: "POST",
    body: request,
    schema: ApproverPreferredBrokerResponseSchema,
  });
}

export function releasePreferredBroker(base: string, preferredBrokerId: number) {
  return apiFetch(`${base}/preferred-brokers/${preferredBrokerId}/release`, {
    ...GUEST,
    method: "POST",
    schema: ApproverPreferredBrokerResponseSchema,
  });
}

export type ReviewScope = "ME" | "OFFICE";

export function fetchTrustSummary() {
  return apiFetch("/api/visit-trust/me", { schema: BrokerVisitTrustSummaryResponseSchema });
}

export function listReceivedReviews(params: { scope: ReviewScope; page: number; size: number }) {
  return apiFetch(withQuery("/api/visit-reviews/received", { ...params }), {
    schema: BrokerReceivedVisitReviewListResponseSchema,
  });
}

export function fileReviewDispute(reviewId: number, request: VisitReviewDisputeCreateRequest) {
  return apiFetch(`/api/visit-reviews/${reviewId}/disputes`, {
    method: "POST",
    body: request,
    schema: VisitReviewDisputeResponseSchema,
  });
}

export function sendApproverOtp(request: ApproverOtpSendRequest) {
  return apiFetch("/api/public/approver-auth/otp", {
    ...PORTAL,
    method: "POST",
    body: request,
    schema: ApproverOtpSendResponseSchema,
  });
}

export function verifyApproverOtp(request: ApproverOtpVerifyRequest) {
  return apiFetch("/api/public/approver-auth/verify", {
    ...PORTAL,
    method: "POST",
    body: request,
    schema: ApproverSessionResponseSchema,
  });
}

export function logoutApprover() {
  return apiFetch("/api/approver-portal/session", { ...PORTAL, method: "DELETE" });
}

export function fetchApproverProfile(signal?: AbortSignal) {
  return apiFetch("/api/approver-portal/profile", {
    ...PORTAL,
    signal,
    retry: false,
    schema: ApproverProfileResponseSchema,
  });
}

export function closeApproverProfile() {
  return apiFetch("/api/approver-portal/profile/close", {
    ...PORTAL,
    method: "POST",
    body: { confirm: true },
    schema: ApproverProfileCloseResponseSchema,
  });
}

export function fetchPortalApprovals(signal?: AbortSignal) {
  return apiFetch("/api/approver-portal/approvals", {
    ...PORTAL,
    signal,
    retry: false,
    schema: ApproverPortalApprovalListResponseSchema,
  });
}

export function decideApprovalLink(approvalId: number, decision: "ACCEPT" | "REJECT") {
  return apiFetch(`/api/approver-portal/approvals/${approvalId}/link-decision`, {
    ...PORTAL,
    method: "POST",
    body: { decision },
    schema: ApproverLinkDecisionResponseSchema,
  });
}

export function unlinkApproval(approvalId: number) {
  return apiFetch(`/api/approver-portal/approvals/${approvalId}/link`, {
    ...PORTAL,
    method: "DELETE",
  });
}

export function previewBulkConditions(request: ApproverConditionBulkPreviewRequest) {
  return apiFetch("/api/approver-portal/condition-bulk/preview", {
    ...PORTAL,
    method: "POST",
    body: request,
    schema: ApproverConditionBulkPreviewResponseSchema,
  });
}

export function applyBulkConditions(request: ApproverConditionBulkApplyRequest) {
  return apiFetch("/api/approver-portal/condition-bulk", {
    ...PORTAL,
    method: "POST",
    body: request,
    schema: ApproverConditionBulkApplyResponseSchema,
  });
}
