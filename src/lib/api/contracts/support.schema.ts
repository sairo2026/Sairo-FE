// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const EnterpriseLeadCreateRequestSchema = z.object({
  companyName: z.string(),
  contactName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  branchCount: z.number(),
  expectedSeats: z.number(),
  migrationNeeded: z.boolean(),
  content: z.string(),
  privacyNoticeAcknowledged: z.boolean(),
});
export type EnterpriseLeadCreateRequest = z.infer<typeof EnterpriseLeadCreateRequestSchema>;

export const EnterpriseLeadCreateResponseSchema = z.object({
  leadId: z.number(),
  trackingKey: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type EnterpriseLeadCreateResponse = z.infer<typeof EnterpriseLeadCreateResponseSchema>;

export const EnterpriseLeadStatusResponseSchema = z.object({
  leadId: z.number(),
  status: z.string(),
  quoteId: z.number().nullable().optional(),
  quoteVersion: z.number().nullable().optional(),
  quoteAmount: z.number().nullable().optional(),
  quoteExpiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type EnterpriseLeadStatusResponse = z.infer<typeof EnterpriseLeadStatusResponseSchema>;

export const EnterpriseLeadQuoteDecisionRequestSchema = z.object({});
export type EnterpriseLeadQuoteDecisionRequest = z.infer<
  typeof EnterpriseLeadQuoteDecisionRequestSchema
>;

export const EnterpriseQuoteAcceptResponseSchema = z.object({
  leadId: z.number(),
  status: z.string(),
  quoteId: z.number(),
  quoteVersion: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type EnterpriseQuoteAcceptResponse = z.infer<typeof EnterpriseQuoteAcceptResponseSchema>;

export const EnterpriseQuoteRejectResponseSchema = z.object({
  leadId: z.number(),
  status: z.string(),
  quoteId: z.number(),
  quoteVersion: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type EnterpriseQuoteRejectResponse = z.infer<typeof EnterpriseQuoteRejectResponseSchema>;

export const PrivacyRequestCreateRequestSchema = z.object({
  requestType: z.string(),
  content: z.string(),
  requestScope: z.string().nullable().optional(),
});
export type PrivacyRequestCreateRequest = z.infer<typeof PrivacyRequestCreateRequestSchema>;

export const PrivacyRequestCreateResponseSchema = z.object({
  requestId: z.number(),
  supportInquiryId: z.number().nullable(),
  requestType: z.enum([
    "ACCESS",
    "CORRECTION",
    "DELETION",
    "SUSPENSION",
    "WITHDRAWAL",
    "PORTABILITY",
  ]),
  identityStatus: z.enum(["PENDING", "VERIFIED", "FAILED"]),
  status: z.enum([
    "RECEIVED",
    "FORWARDED",
    "WAITING_FOR_INFO",
    "REVIEWING",
    "APPROVED",
    "PARTIALLY_RESTRICTED",
    "EXECUTING",
    "COMPLETED",
    "REJECTED",
  ]),
  receivedAt: z.string(),
  legalDueAt: z.string(),
  internalDueAt: z.string(),
});
export type PrivacyRequestCreateResponse = z.infer<typeof PrivacyRequestCreateResponseSchema>;

export const SupportInquiryCreateRequestSchema = z.object({
  category: z.string(),
  content: z.string(),
  requestScope: z.string().nullable().optional(),
});
export type SupportInquiryCreateRequest = z.infer<typeof SupportInquiryCreateRequestSchema>;

export const SupportInquiryCreateResponseSchema = z.object({
  inquiryId: z.number(),
  status: z.string(),
  responseDueAt: z.string(),
  officeId: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type SupportInquiryCreateResponse = z.infer<typeof SupportInquiryCreateResponseSchema>;

export const SupportInquiryListResponseSchema = z.object({
  items: z.array(
    z.object({
      inquiryId: z.number(),
      officeId: z.number().nullable(),
      category: z.enum([
        "SIGNUP",
        "AUTH",
        "BUSINESS",
        "BILLING",
        "MIGRATION",
        "PRIVACY",
        "BUG",
        "ENTERPRISE",
      ]),
      status: z.enum(["OPEN", "ASSIGNED", "WAITING_FOR_CUSTOMER", "ANSWERED", "CLOSED"]),
      priority: z.enum(["LOW", "NORMAL", "HIGH"]),
      assignedOperatorName: z.string().nullable(),
      responseDueAt: z.string(),
      answeredAt: z.string().nullable(),
      closedAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      version: z.number(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type SupportInquiryListResponse = z.infer<typeof SupportInquiryListResponseSchema>;

export const PolicyDocumentListResponseSchema = z.object({
  items: z.array(
    z.object({
      docType: z.string(),
      version: z.string(),
      effectiveAt: z.iso.datetime({ offset: true }),
      requiresConsent: z.boolean(),
      body: z.string(),
    }),
  ),
});
export type PolicyDocumentListResponse = z.infer<typeof PolicyDocumentListResponseSchema>;

export const SupportInquiryResponseSchema = z.object({
  inquiryId: z.number(),
  officeId: z.number().nullable(),
  category: z.string(),
  content: z.string(),
  requestScope: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  assignedOperatorName: z.string().nullable(),
  responseDueAt: z.iso.datetime({ offset: true }),
  answeredAt: z.iso.datetime({ offset: true }).nullable().optional(),
  closedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
  messages: z.array(
    z.object({
      messageId: z.number(),
      visibility: z.enum(["PUBLIC", "INTERNAL"]),
      content: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
      authorType: z.string(),
      authorDisplayName: z.string().nullable(),
    }),
  ),
  attachments: z.array(
    z.object({
      attachmentId: z.number(),
      fileName: z.string(),
      mediaType: z.string(),
      sizeBytes: z.number(),
      scanStatus: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
      messageId: z.number().nullable(),
    }),
  ),
});
export type SupportInquiryResponse = z.infer<typeof SupportInquiryResponseSchema>;

export const SupportInquiryAttachmentResponseSchema = z.object({
  attachmentId: z.number(),
  inquiryId: z.number(),
  messageId: z.number().nullable(),
  scanStatus: z.enum(["PENDING", "CLEAN", "REJECTED"]),
  fileName: z.string(),
  mediaType: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string(),
});
export type SupportInquiryAttachmentResponse = z.infer<
  typeof SupportInquiryAttachmentResponseSchema
>;

export const SupportInquiryAttachmentDownloadResponseSchema = z.object({});
export type SupportInquiryAttachmentDownloadResponse = z.infer<
  typeof SupportInquiryAttachmentDownloadResponseSchema
>;

export const SupportInquiryReplyRequestSchema = z.object({ content: z.string() });
export type SupportInquiryReplyRequest = z.infer<typeof SupportInquiryReplyRequestSchema>;

export const SupportInquiryReplyResponseSchema = z.object({
  messageId: z.number(),
  inquiryId: z.number(),
  visibility: z.string(),
  status: z.enum(["OPEN", "ASSIGNED", "WAITING_FOR_CUSTOMER", "ANSWERED", "CLOSED"]),
  content: z.string(),
  createdAt: z.string(),
  officeId: z.number().nullable(),
  updatedAt: z.string(),
  version: z.number(),
});
export type SupportInquiryReplyResponse = z.infer<typeof SupportInquiryReplyResponseSchema>;

export const PrivacyRequestListResponseSchema = z.object({
  items: z.array(
    z.object({
      requestId: z.number(),
      requestType: z.enum([
        "ACCESS",
        "CORRECTION",
        "DELETION",
        "SUSPENSION",
        "WITHDRAWAL",
        "PORTABILITY",
      ]),
      status: z.enum([
        "RECEIVED",
        "FORWARDED",
        "WAITING_FOR_INFO",
        "REVIEWING",
        "APPROVED",
        "PARTIALLY_RESTRICTED",
        "EXECUTING",
        "COMPLETED",
        "REJECTED",
      ]),
      identityStatus: z.enum(["PENDING", "VERIFIED", "FAILED"]),
      receivedAt: z.iso.datetime({ offset: true }),
      legalDueAt: z.iso.datetime({ offset: true }),
      completedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      decisionReason: z.string().nullable().optional(),
      responsibleOfficeName: z.string().nullable().optional(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type PrivacyRequestListResponse = z.infer<typeof PrivacyRequestListResponseSchema>;

export const PrivacyRequestResponseSchema = z.object({
  requestId: z.number(),
  requestType: z.enum([
    "ACCESS",
    "CORRECTION",
    "DELETION",
    "SUSPENSION",
    "WITHDRAWAL",
    "PORTABILITY",
  ]),
  status: z.enum([
    "RECEIVED",
    "FORWARDED",
    "WAITING_FOR_INFO",
    "REVIEWING",
    "APPROVED",
    "PARTIALLY_RESTRICTED",
    "EXECUTING",
    "COMPLETED",
    "REJECTED",
  ]),
  identityStatus: z.enum(["PENDING", "VERIFIED", "FAILED"]),
  receivedAt: z.iso.datetime({ offset: true }),
  legalDueAt: z.iso.datetime({ offset: true }),
  internalDueAt: z.iso.datetime({ offset: true }),
  completedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  supplementRequest: z.string().nullable(),
  decisionReason: z.string().nullable().optional(),
  responsibleOfficeName: z.string().nullable().optional(),
  handlerType: z.enum(["SAIRO", "OFFICE"]),
});
export type PrivacyRequestResponse = z.infer<typeof PrivacyRequestResponseSchema>;
