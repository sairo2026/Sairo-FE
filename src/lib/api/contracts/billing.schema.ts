// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const ReturnVisitResultRequestSchema = z.object({});
export type ReturnVisitResultRequest = z.infer<typeof ReturnVisitResultRequestSchema>;

export const ReturnVisitResultResponseSchema = z.object({});
export type ReturnVisitResultResponse = z.infer<typeof ReturnVisitResultResponseSchema>;

export const ArchiveGrantCreateRequestSchema = z.object({
  officeId: z.number(),
  grantedToUserId: z.number(),
  contractReference: z.string(),
});
export type ArchiveGrantCreateRequest = z.infer<typeof ArchiveGrantCreateRequestSchema>;

export const ArchiveGrantCreateResponseSchema = z.object({
  grantId: z.number(),
  officeId: z.number(),
  expiresAt: z.string().nullable().optional(),
  revoked: z.boolean(),
});
export type ArchiveGrantCreateResponse = z.infer<typeof ArchiveGrantCreateResponseSchema>;

export const ArchiveGrantStatusResponseSchema = z.object({
  grantId: z.number(),
  officeId: z.number(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  revoked: z.boolean(),
});
export type ArchiveGrantStatusResponse = z.infer<typeof ArchiveGrantStatusResponseSchema>;

export const ArchiveGrantExportResponseSchema = z.object({
  exportId: z.number(),
  status: z.string(),
  downloadUrl: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  fileExpiresAt: z.string().nullable(),
});
export type ArchiveGrantExportResponse = z.infer<typeof ArchiveGrantExportResponseSchema>;

export const BillingInvoiceListResponseSchema = z.object({
  items: z.array(
    z.object({
      periodEnd: z.iso.datetime({ offset: true }),
      periodStart: z.iso.datetime({ offset: true }),
      refundedAmount: z.number(),
      refundableAmount: z.number(),
      invoiceId: z.number(),
      amount: z.number(),
      memberCount: z.number(),
      consentAmountLimit: z.number(),
      status: z.string(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type BillingInvoiceListResponse = z.infer<typeof BillingInvoiceListResponseSchema>;

export const BillingInvoiceDetailResponseSchema = z.object({
  periodEnd: z.iso.datetime({ offset: true }),
  periodStart: z.iso.datetime({ offset: true }),
  refundedAmount: z.number(),
  refundableAmount: z.number(),
  nextRetryAt: z.iso.datetime({ offset: true }).nullable().optional(),
  attempts: z.array(
    z.object({
      failureCategory: z.string().nullable().optional(),
      pgOrderId: z.string(),
      pgTransactionId: z.string().nullable().optional(),
      result: z.string(),
      attemptedAt: z.iso.datetime({ offset: true }),
    }),
  ),
  invoiceId: z.number(),
  amount: z.number(),
  supplyAmount: z.number().nullable(),
  vatAmount: z.number().nullable(),
  vatRateBp: z.number().nullable(),
  memberCount: z.number(),
  consentAmountLimit: z.number(),
  status: z.string(),
  supplier: z.object({ infoVersion: z.number() }).nullable(),
  taxDocuments: z.array(
    z.object({
      documentKind: z.string(),
      status: z.string(),
      issuedOn: z.iso.date().nullable(),
      maskedReceiverEmail: z.string().nullable(),
      supplyAmount: z.number().nullable(),
      vatAmount: z.number().nullable(),
    }),
  ),
});
export type BillingInvoiceDetailResponse = z.infer<typeof BillingInvoiceDetailResponseSchema>;

export const BillingPlanListResponseSchema = z.object({
  priceVersion: z.string(),
  priceKind: z.enum(["STANDARD", "START_CUSTOMER"]),
  vatIncluded: z.boolean(),
  memberCount: z.number(),
  plans: z.array(
    z.object({
      planCode: z.string(),
      basePrice: z.number().nullable().optional(),
      perSeatPrice: z.number().nullable().optional(),
      estimatedAmount: z.number().nullable().optional(),
      tiers: z.array(
        z.object({
          minMembers: z.number(),
          maxMembers: z.number().nullable().optional(),
          basePrice: z.number(),
          includedMembers: z.number(),
          perSeatPrice: z.number().nullable().optional(),
        }),
      ),
    }),
  ),
});
export type BillingPlanListResponse = z.infer<typeof BillingPlanListResponseSchema>;

export const ArchiveGrantAuthResponseSchema = z.object({
  grantId: z.number(),
  grantType: z.string(),
  expiresAt: z.string().nullable().optional(),
});
export type ArchiveGrantAuthResponse = z.infer<typeof ArchiveGrantAuthResponseSchema>;

export const GrantAuthRequestSchema = z.object({
  grantId: z.number(),
  authMethod: z.string(),
  credential: z.string(),
});
export type GrantAuthRequest = z.infer<typeof GrantAuthRequestSchema>;

export const GrantAuthResponseSchema = z.object({
  grantId: z.number(),
  grantType: z.string(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type GrantAuthResponse = z.infer<typeof GrantAuthResponseSchema>;

export const AuthStatusResponseSchema = z.object({
  authSuspended: z.boolean(),
  suspendedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  reauthDeadlineAt: z.iso.datetime({ offset: true }).nullable().optional(),
  trialRemainingSeconds: z.number().nullable().optional(),
});
export type AuthStatusResponse = z.infer<typeof AuthStatusResponseSchema>;

export const RefundRequestCreateRequestSchema = z.object({
  invoiceId: z.number(),
  reasonCode: z.string(),
  reasonEventType: z.string().nullable().optional(),
  reasonEventId: z.number().nullable().optional(),
});
export type RefundRequestCreateRequest = z.infer<typeof RefundRequestCreateRequestSchema>;

export const RefundRequestCreateResponseSchema = z.object({
  refundId: z.number(),
  status: z.string(),
});
export type RefundRequestCreateResponse = z.infer<typeof RefundRequestCreateResponseSchema>;

export const RefundRequestStatusResponseSchema = z.object({
  refundId: z.number(),
  invoiceId: z.number(),
  status: z.string(),
  reasonCode: z.string(),
  entitlementAmount: z.number().nullable().optional(),
  previousRefundAmount: z.number(),
  reservedAmount: z.number(),
  refundAmount: z.number().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  calculation: z
    .object({
      originalApprovedAmount: z.number(),
      totalPeriodSeconds: z.number().nullable(),
      remainingPeriodSeconds: z.number().nullable().optional(),
      couponExcludedAmount: z.number(),
      priorCompensationAmount: z.number(),
      effectiveEndAt: z.iso.datetime({ offset: true }).nullable().optional(),
    })
    .nullable()
    .optional(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type RefundRequestStatusResponse = z.infer<typeof RefundRequestStatusResponseSchema>;

export const ReturnGrantStatusResponseSchema = z.object({
  grantId: z.number(),
  officeId: z.number(),
  expiresAt: z.iso.datetime({ offset: true }),
  revoked: z.boolean(),
});
export type ReturnGrantStatusResponse = z.infer<typeof ReturnGrantStatusResponseSchema>;

export const ReturnGrantExportResponseSchema = z.object({
  exportId: z.number(),
  status: z.string(),
  downloadUrl: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  fileExpiresAt: z.string().nullable(),
  failureReason: z.string().nullable().optional(),
});
export type ReturnGrantExportResponse = z.infer<typeof ReturnGrantExportResponseSchema>;

export const BillingKeyDeleteResponseSchema = z.object({});
export type BillingKeyDeleteResponse = z.infer<typeof BillingKeyDeleteResponseSchema>;

export const BillingKeyRegisterRequestSchema = z.object({
  authKey: z.string(),
  customerKey: z.string(),
  cardNoticeVersion: z.string(),
});
export type BillingKeyRegisterRequest = z.infer<typeof BillingKeyRegisterRequestSchema>;

export const BillingKeyRegisterResponseSchema = z.object({
  registered: z.boolean(),
  registeredAt: z.string(),
  firstBillingScheduledAt: z.string().nullable().optional(),
});
export type BillingKeyRegisterResponse = z.infer<typeof BillingKeyRegisterResponseSchema>;

export const SubscriptionCancelRequestSchema = z.object({});
export type SubscriptionCancelRequest = z.infer<typeof SubscriptionCancelRequestSchema>;

export const SubscriptionCancelResponseSchema = z.object({
  effectiveAt: z.string(),
  revokedAt: z.string().nullable(),
});
export type SubscriptionCancelResponse = z.infer<typeof SubscriptionCancelResponseSchema>;

export const SubscriptionCancelWithdrawResponseSchema = z.object({
  withdrawn: z.boolean(),
  revokedAt: z.string(),
});
export type SubscriptionCancelWithdrawResponse = z.infer<
  typeof SubscriptionCancelWithdrawResponseSchema
>;

export const SubscriptionCurrentResponseSchema = z.object({
  status: z.string(),
  plan: z.string(),
  memberCount: z.number(),
  priceVersion: z.string(),
  startCustomer: z.record(z.string(), z.unknown()).nullable(),
  pendingPriceChangeNoticeCount: z.number(),
  trialEndsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  currentPeriodEnd: z.iso.datetime({ offset: true }),
  nextChargeAt: z.iso.datetime({ offset: true }).nullable().optional(),
  nextChargeAmount: z.number().nullable().optional(),
  firstBillingScheduledAt: z.iso.datetime({ offset: true }).nullable().optional(),
  prePaymentSince: z.iso.datetime({ offset: true }).nullable().optional(),
  pastDueSince: z.iso.datetime({ offset: true }).nullable().optional(),
  restrictedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  terminationAt: z.iso.datetime({ offset: true }).nullable().optional(),
  cancellationEffectiveAt: z.iso.datetime({ offset: true }).nullable().optional(),
  outstandingAmount: z.number(),
  canRetryPayment: z.boolean(),
  latestInvoice: z
    .object({
      invoiceId: z.number(),
      status: z.string(),
      nextRetryAt: z.iso.datetime({ offset: true }).nullable().optional(),
      lastFailureCategory: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  paymentMethod: z
    .object({
      cardIssuer: z.string().nullable().optional(),
      cardLast4: z.string().nullable().optional(),
      registeredAt: z.iso.datetime({ offset: true }),
    })
    .nullable()
    .optional(),
  readiness: z.object({ hasValidConsent: z.boolean(), hasBillingKey: z.boolean() }),
  isInReturnPeriod: z.boolean(),
  returnPeriodEndsAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type SubscriptionCurrentResponse = z.infer<typeof SubscriptionCurrentResponseSchema>;

export const FirstPaymentRequestSchema = z.object({});
export type FirstPaymentRequest = z.infer<typeof FirstPaymentRequestSchema>;

export const FirstPaymentResponseSchema = z.object({
  status: z.string(),
  plan: z.string(),
  trialEndsAt: z.string().nullable().optional(),
  currentPeriodEnd: z.string(),
  pastDueSince: z.string().nullable().optional(),
  cancellationEffectiveAt: z.string().nullable().optional(),
  outstandingAmount: z.number(),
  isInReturnPeriod: z.boolean(),
  returnPeriodEndsAt: z.string().nullable().optional(),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  subscriptionId: z.number(),
});
export type FirstPaymentResponse = z.infer<typeof FirstPaymentResponseSchema>;

export const SubscriptionPurchaseConsentRequestSchema = z.object({
  periodEnd: z.iso.datetime({ offset: true }),
  periodStart: z.iso.datetime({ offset: true }),
  termsVersion: z.string(),
  plan: z.string(),
  memberCount: z.number(),
  priceVersion: z.string().nullable().optional(),
  priceChangeNoticeId: z.number().nullable().optional(),
  totalAmountInclVat: z.number(),
  amountLimit: z.number(),
  nextChargeAt: z.iso.datetime({ offset: true }),
  agreed: z.boolean(),
});
export type SubscriptionPurchaseConsentRequest = z.infer<
  typeof SubscriptionPurchaseConsentRequestSchema
>;

export const SubscriptionPurchaseConsentResponseSchema = z.object({
  termsVersion: z.string(),
  totalAmountInclVat: z.number(),
  vatAmount: z.number(),
  amountLimit: z.number(),
  agreedAt: z.string(),
});
export type SubscriptionPurchaseConsentResponse = z.infer<
  typeof SubscriptionPurchaseConsentResponseSchema
>;

export const RetryPaymentRequestSchema = z.object({});
export type RetryPaymentRequest = z.infer<typeof RetryPaymentRequestSchema>;

export const RetryPaymentResponseSchema = z.object({
  status: z.string(),
  plan: z.string(),
  trialEndsAt: z.string().nullable().optional(),
  currentPeriodEnd: z.string(),
  pastDueSince: z.string().nullable().optional(),
  cancellationEffectiveAt: z.string().nullable().optional(),
  outstandingAmount: z.number(),
  isInReturnPeriod: z.boolean(),
  returnPeriodEndsAt: z.string().nullable().optional(),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  subscriptionId: z.number(),
});
export type RetryPaymentResponse = z.infer<typeof RetryPaymentResponseSchema>;

export const BillingKeySessionResponseSchema = z.object({
  customerKey: z.string(),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type BillingKeySessionResponse = z.infer<typeof BillingKeySessionResponseSchema>;

export const PurchaseConsentPreviewResponseSchema = z.object({
  termsVersion: z.string(),
  plan: z.string(),
  memberCount: z.number(),
  priceVersion: z.string(),
  priceChangeNoticeId: z.number().nullable(),
  totalAmountInclVat: z.number(),
  vatAmount: z.number(),
  amountLimit: z.number(),
  periodStart: z.iso.datetime({ offset: true }),
  periodEnd: z.iso.datetime({ offset: true }),
  nextChargeAt: z.iso.datetime({ offset: true }),
  firstBillingScheduledAt: z.iso.datetime({ offset: true }).nullable(),
  autoRenewal: z.boolean(),
  cancellationTerms: z.string(),
  refundTerms: z.string(),
  checkItems: z.array(z.string()),
  errorMessages: z.record(z.string(), z.string()),
});
export type PurchaseConsentPreviewResponse = z.infer<typeof PurchaseConsentPreviewResponseSchema>;

export const RefundRequestListResponseSchema = z.object({
  items: z.array(
    z.object({
      refundId: z.number(),
      invoiceId: z.number(),
      status: z.string(),
      reasonCode: z.string(),
      refundAmount: z.number().nullable().optional(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type RefundRequestListResponse = z.infer<typeof RefundRequestListResponseSchema>;

export const PriceChangeNoticeDeclineResponseSchema = z.object({
  noticeId: z.number(),
  decision: z.string(),
  decidedAt: z.iso.datetime({ offset: true }),
  subscriptionEndsAt: z.iso.datetime({ offset: true }),
});
export type PriceChangeNoticeDeclineResponse = z.infer<
  typeof PriceChangeNoticeDeclineResponseSchema
>;

export const PriceChangeNoticeListResponseSchema = z.object({
  items: z.array(
    z.object({
      noticeId: z.number(),
      changeKind: z.enum(["INCREASE", "NON_INCREASE"]),
      fromPriceVersion: z.string(),
      toPriceVersion: z.string(),
      memberCount: z.number(),
      currentAmountInclVat: z.number(),
      newAmountInclVat: z.number(),
      notifiedAt: z.iso.datetime({ offset: true }),
      effectiveAt: z.iso.datetime({ offset: true }),
      appliesFromPeriodStart: z.iso.datetime({ offset: true }),
      responseDueAt: z.iso.datetime({ offset: true }),
      decision: z.enum(["PENDING", "AGREED", "DECLINED", "NOT_REQUIRED", "ENDED_NO_CONSENT"]),
      decidedAt: z.iso.datetime({ offset: true }).nullable(),
      consentRequired: z.boolean(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type PriceChangeNoticeListResponse = z.infer<typeof PriceChangeNoticeListResponseSchema>;

export const PublicPricingResponseSchema = z.object({
  priceVersion: z.string(),
  effectiveAt: z.iso.datetime({ offset: true }),
  currency: z.string(),
  vatIncluded: z.boolean(),
  billingCycle: z.string(),
  autoRenew: z.boolean(),
  plans: z.array(
    z.object({
      planCode: z.enum(["SOLO", "TEAM"]),
      minMembers: z.number(),
      maxMembers: z.number().nullable(),
      baseAmount: z.number(),
      includedMembers: z.number(),
      perSeatAmount: z.number().nullable(),
      imageUrl: z.string().nullable().optional(),
    }),
  ),
  examples: z.array(z.object({ members: z.number(), monthlyAmount: z.number() })),
  enterprise: z.object({ quotedByInquiry: z.boolean(), autoChargeBeforeApproval: z.boolean() }),
  refundPolicyVersion: z.string().nullable(),
  generalTrial: z
    .object({
      freeEndMode: z.enum(["DURATION", "FIXED_END"]),
      durationDays: z.number().nullable(),
      fixedFreeEndsAt: z.iso.datetime({ offset: true }).nullable(),
      applicantWindowEndsAt: z.iso.datetime({ offset: true }).nullable(),
    })
    .nullable(),
  links: z.object({ termsUrl: z.string(), refundUrl: z.string(), privacyUrl: z.string() }),
  provisionalPrice: z.boolean(),
});
export type PublicPricingResponse = z.infer<typeof PublicPricingResponseSchema>;

export const StartCustomerAgreementResponseSchema = z.object({
  agreementId: z.number(),
  status: z.string(),
  freeEndsAt: z.iso.datetime({ offset: true }),
  priceVersion: z.string(),
  priceStartsAt: z.iso.datetime({ offset: true }),
  priceEndsAt: z.iso.datetime({ offset: true }),
  monthlyAmountPreview: z.object({ memberCount: z.number(), amountInclVat: z.number() }),
  conditions: z.object({
    weeklyUseConfirmed: z.boolean(),
    monthlyInterviewConfirmed: z.boolean(),
    casePublicationConsent: z.boolean(),
  }),
  agreementTextVersion: z.string(),
  contractedOn: z.iso.date(),
  ownerAcknowledgedAt: z.iso.datetime({ offset: true }).nullable(),
  version: z.number(),
});
export type StartCustomerAgreementResponse = z.infer<typeof StartCustomerAgreementResponseSchema>;

export const TaxRecipientResponseSchema = z.object({
  registered: z.boolean(),
  recipientId: z.number().nullable(),
  businessNumber: z.string().nullable(),
  companyName: z.string().nullable(),
  representativeName: z.string().nullable(),
  receiverEmail: z.string().nullable(),
  taxType: z.string().nullable(),
  issueRequested: z.boolean(),
  registeredAt: z.iso.datetime({ offset: true }).nullable(),
});
export type TaxRecipientResponse = z.infer<typeof TaxRecipientResponseSchema>;

export const TaxRecipientUpsertRequestSchema = z.object({
  businessNumber: z.string(),
  companyName: z.string(),
  representativeName: z.string(),
  receiverEmail: z.string(),
  taxType: z.string(),
  issueRequested: z.boolean(),
});
export type TaxRecipientUpsertRequest = z.infer<typeof TaxRecipientUpsertRequestSchema>;

export const ArchiveExportResultResponseSchema = z.object({
  exportId: z.number(),
  status: z.string(),
  downloadUrl: z.string().nullable().optional(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  fileExpiresAt: z.iso.datetime({ offset: true }).nullable(),
  failureReason: z.string().nullable().optional(),
});
export type ArchiveExportResultResponse = z.infer<typeof ArchiveExportResultResponseSchema>;

export const ReturnExportResultResponseSchema = z.object({
  exportId: z.number(),
  status: z.string(),
  downloadUrl: z.string().nullable().optional(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  fileExpiresAt: z.iso.datetime({ offset: true }).nullable(),
  failureReason: z.string().nullable().optional(),
});
export type ReturnExportResultResponse = z.infer<typeof ReturnExportResultResponseSchema>;
