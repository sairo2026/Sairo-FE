import {
  EnterpriseLeadCreateResponseSchema,
  EnterpriseLeadStatusResponseSchema,
  EnterpriseQuoteAcceptResponseSchema,
  EnterpriseQuoteRejectResponseSchema,
  PolicyDocumentListResponseSchema,
  PrivacyRequestCreateResponseSchema,
  PrivacyRequestListResponseSchema,
  PrivacyRequestResponseSchema,
  SupportInquiryAttachmentResponseSchema,
  SupportInquiryCreateResponseSchema,
  SupportInquiryListResponseSchema,
  SupportInquiryReplyResponseSchema,
  SupportInquiryResponseSchema,
} from "@/lib/api/contracts/support.schema";
import type {
  EnterpriseLeadCreateRequest,
  PrivacyRequestCreateRequest,
  SupportInquiryCreateRequest,
} from "@/lib/api/contracts/support.schema";
import { apiFetch, withQuery } from "@/shared/api/client";

const PUBLIC_REQUEST = { skipAuthEvents: true, skipStepUp: true } as const;

export function listMyInquiries(params: { page: number; size: number }) {
  return apiFetch(withQuery("/api/support-inquiries/me", params), {
    schema: SupportInquiryListResponseSchema,
  });
}

export function createInquiry(request: SupportInquiryCreateRequest) {
  return apiFetch("/api/support-inquiries", {
    method: "POST",
    body: request,
    schema: SupportInquiryCreateResponseSchema,
  });
}

export function fetchInquiry(inquiryId: number) {
  return apiFetch(`/api/support-inquiries/${inquiryId}`, {
    schema: SupportInquiryResponseSchema,
  });
}

export function replyToInquiry(request: { inquiryId: number; content: string }) {
  return apiFetch(`/api/support-inquiries/${request.inquiryId}/replies`, {
    method: "POST",
    body: { content: request.content },
    schema: SupportInquiryReplyResponseSchema,
  });
}

export function uploadInquiryAttachment(request: {
  inquiryId: number;
  file: File;
  messageId?: number;
}) {
  const form = new FormData();
  form.append("file", request.file);
  if (request.messageId !== undefined) form.append("messageId", String(request.messageId));
  return apiFetch(`/api/support-inquiries/${request.inquiryId}/attachments`, {
    method: "POST",
    body: form,
    schema: SupportInquiryAttachmentResponseSchema,
  });
}

export function attachmentDownloadPath(inquiryId: number, attachmentId: number): string {
  return `/api/support-inquiries/${inquiryId}/attachments/${attachmentId}`;
}

export function fetchPolicyDocuments() {
  return apiFetch("/api/policy-documents", {
    schema: PolicyDocumentListResponseSchema,
    ...PUBLIC_REQUEST,
  });
}

export function createEnterpriseLead(request: EnterpriseLeadCreateRequest) {
  return apiFetch("/api/enterprise-leads", {
    method: "POST",
    body: request,
    schema: EnterpriseLeadCreateResponseSchema,
    ...PUBLIC_REQUEST,
  });
}

export function fetchEnterpriseLead(request: { leadId: number; trackingKey: string }) {
  return apiFetch(`/api/enterprise-leads/${request.leadId}`, {
    headers: { "X-Tracking-Key": request.trackingKey },
    schema: EnterpriseLeadStatusResponseSchema,
    ...PUBLIC_REQUEST,
  });
}

export function acceptEnterpriseQuote(request: {
  leadId: number;
  quoteId: number;
  trackingKey: string;
}) {
  return apiFetch(`/api/enterprise-leads/${request.leadId}/quotes/${request.quoteId}/accept`, {
    method: "POST",
    headers: { "X-Tracking-Key": request.trackingKey },
    schema: EnterpriseQuoteAcceptResponseSchema,
    ...PUBLIC_REQUEST,
  });
}

export function rejectEnterpriseQuote(request: {
  leadId: number;
  quoteId: number;
  trackingKey: string;
}) {
  return apiFetch(`/api/enterprise-leads/${request.leadId}/quotes/${request.quoteId}/reject`, {
    method: "POST",
    headers: { "X-Tracking-Key": request.trackingKey },
    schema: EnterpriseQuoteRejectResponseSchema,
    ...PUBLIC_REQUEST,
  });
}

export function listMyPrivacyRequests(params: { page: number; size: number; status?: string }) {
  return apiFetch(
    withQuery("/api/privacy-requests/me", {
      page: params.page,
      size: params.size,
      status: params.status || undefined,
    }),
    { schema: PrivacyRequestListResponseSchema },
  );
}

export function createPrivacyRequest(request: PrivacyRequestCreateRequest) {
  return apiFetch("/api/privacy-requests", {
    method: "POST",
    body: request,
    schema: PrivacyRequestCreateResponseSchema,
  });
}

export function fetchPrivacyRequest(requestId: number) {
  return apiFetch(`/api/privacy-requests/${requestId}`, {
    schema: PrivacyRequestResponseSchema,
  });
}
