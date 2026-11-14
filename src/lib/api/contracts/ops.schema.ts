// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const OwnerTransferOperatorApproveResponseSchema = z.object({
  transferId: z.number(),
  status: z.string(),
  completedAt: z.iso.datetime({ offset: true }),
});
export type OwnerTransferOperatorApproveResponse = z.infer<
  typeof OwnerTransferOperatorApproveResponseSchema
>;

export const OpsOwnerTransferListResponseSchema = z.object({
  items: z.array(
    z.object({
      transferId: z.number(),
      officeId: z.number(),
      officeName: z.string(),
      fromDisplayName: z.string(),
      toDisplayName: z.string(),
      status: z.enum(["PENDING", "UNDER_REVIEW", "COMPLETED", "REJECTED", "WITHDRAWN", "EXPIRED"]),
      requestedAt: z.iso.datetime({ offset: true }),
      acceptDeadlineAt: z.iso.datetime({ offset: true }),
      acceptedAt: z.iso.datetime({ offset: true }).nullable(),
      completedAt: z.iso.datetime({ offset: true }).nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsOwnerTransferListResponse = z.infer<typeof OpsOwnerTransferListResponseSchema>;

export const OpsAnnouncementListResponseSchema = z.object({
  items: z.array(
    z.object({
      announcementId: z.number(),
      title: z.string(),
      content: z.string(),
      versionNo: z.number(),
      previousVersionId: z.number().nullable(),
      audienceType: z.enum(["ALL", "SUBSCRIPTION_STATUS", "OFFICE"]),
      audienceStatus: z.string().nullable(),
      audienceOfficeId: z.number().nullable(),
      startsAt: z.string().nullable(),
      endsAt: z.string().nullable(),
      importance: z.enum(["NORMAL", "IMPORTANT", "CRITICAL"]),
      detailUrl: z.string().nullable(),
      marketing: z.boolean(),
      status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "ENDED"]),
      scheduledAt: z.string().nullable(),
      publishedAt: z.string().nullable(),
      endedAt: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsAnnouncementListResponse = z.infer<typeof OpsAnnouncementListResponseSchema>;

export const OpsAnnouncementCreateRequestSchema = z.object({
  title: z.string(),
  content: z.string(),
  audienceType: z.string(),
  audienceStatus: z.string().nullable().optional(),
  audienceOfficeId: z.number().nullable().optional(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  importance: z.string(),
  detailUrl: z.string().nullable().optional(),
  marketing: z.boolean(),
});
export type OpsAnnouncementCreateRequest = z.infer<typeof OpsAnnouncementCreateRequestSchema>;

export const OpsAnnouncementCreateResponseSchema = z.object({
  announcementId: z.number(),
  versionNo: z.number(),
  status: z.string(),
  scheduledAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
});
export type OpsAnnouncementCreateResponse = z.infer<typeof OpsAnnouncementCreateResponseSchema>;

export const OpsAnnouncementPublishRequestSchema = z.object({
  scheduledAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type OpsAnnouncementPublishRequest = z.infer<typeof OpsAnnouncementPublishRequestSchema>;

export const OpsAnnouncementPublishResponseSchema = z.object({
  announcementId: z.number(),
  versionNo: z.number(),
  status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "ENDED"]),
  scheduledAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
});
export type OpsAnnouncementPublishResponse = z.infer<typeof OpsAnnouncementPublishResponseSchema>;

export const OpsArchiveGrantListResponseSchema = z.object({
  items: z.array(
    z.object({
      grantId: z.number(),
      officeId: z.number(),
      grantedToUserId: z.number(),
      contractReference: z.string().nullable(),
      grantedAt: z.string(),
      expiresAt: z.string().nullable(),
      terminatedAt: z.string().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsArchiveGrantListResponse = z.infer<typeof OpsArchiveGrantListResponseSchema>;

export const OpsAuditLogResponseSchema = z.object({
  items: z.array(
    z.object({
      auditId: z.number(),
      operatorAccountId: z.number(),
      operatorName: z.string(),
      actionType: z.string(),
      targetType: z.string().nullable(),
      targetId: z.number().nullable(),
      detail: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsAuditLogResponse = z.infer<typeof OpsAuditLogResponseSchema>;

export const OpsKakaoCallbackResponseSchema = z.object({});
export type OpsKakaoCallbackResponse = z.infer<typeof OpsKakaoCallbackResponseSchema>;

export const OpsKakaoAuthorizationResponseSchema = z.object({});
export type OpsKakaoAuthorizationResponse = z.infer<typeof OpsKakaoAuthorizationResponseSchema>;

export const OpsLogoutResponseSchema = z.object({});
export type OpsLogoutResponse = z.infer<typeof OpsLogoutResponseSchema>;

export const OpsBillingInvoiceListResponseSchema = z.object({
  items: z.array(
    z.object({
      invoiceId: z.number(),
      officeId: z.number(),
      subscriptionId: z.number(),
      billingPeriodStart: z.string(),
      billingPeriodEnd: z.string(),
      amount: z.number(),
      memberCountSnapshot: z.number(),
      unitPriceSnapshot: z.number(),
      vatIncludedAmount: z.number(),
      priceVersion: z.string(),
      consentVersion: z.string(),
      consentAmountLimit: z.number(),
      consentedAt: z.string(),
      purchaseConsentId: z.number(),
      status: z.enum([
        "UNBILLED",
        "PROCESSING",
        "VERIFYING",
        "PAID",
        "FAILED",
        "PARTIALLY_REFUNDED",
        "FULLY_REFUNDED",
        "CANCELLED",
      ]),
      dueAt: z.string(),
      paidAt: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsBillingInvoiceListResponse = z.infer<typeof OpsBillingInvoiceListResponseSchema>;

export const OpsBillingReconciliationListResponseSchema = z.object({
  items: z.array(
    z.object({
      entryId: z.number(),
      businessDate: z.string(),
      sourceType: z.enum(["PG_QUERY", "PG_FILE", "INTERNAL"]),
      pgOrderId: z.string().nullable(),
      invoiceId: z.number().nullable(),
      refundRequestId: z.number().nullable(),
      officeId: z.number().nullable(),
      internalAmount: z.number().nullable(),
      pgAmount: z.number().nullable(),
      status: z.enum(["MATCHED", "AMOUNT_MISMATCH", "PG_ONLY", "INTERNAL_ONLY", "VERIFYING"]),
      differenceReason: z.string().nullable(),
      resolutionEvidence: z.string().nullable(),
      assignedOperatorId: z.number().nullable(),
      resolvedAt: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsBillingReconciliationListResponse = z.infer<
  typeof OpsBillingReconciliationListResponseSchema
>;

export const OpsBillingReconciliationResolveRequestSchema = z.object({
  differenceReason: z.string(),
  resolutionEvidence: z.string(),
  assigneeOperatorId: z.number().nullable().optional(),
});
export type OpsBillingReconciliationResolveRequest = z.infer<
  typeof OpsBillingReconciliationResolveRequestSchema
>;

export const OpsBillingReconciliationResolveResponseSchema = z.object({
  entryId: z.number(),
  status: z.enum(["MATCHED", "AMOUNT_MISMATCH", "PG_ONLY", "INTERNAL_ONLY", "VERIFYING"]),
  differenceReason: z.string().nullable(),
  resolutionEvidence: z.string().nullable(),
  assignedOperatorId: z.number().nullable(),
  resolvedAt: z.string().nullable(),
});
export type OpsBillingReconciliationResolveResponse = z.infer<
  typeof OpsBillingReconciliationResolveResponseSchema
>;

export const OpsBusinessCalendarResponseSchema = z.object({
  items: z.array(
    z.object({
      calendarDate: z.string(),
      isBusinessDay: z.boolean(),
      reason: z.string().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsBusinessCalendarResponse = z.infer<typeof OpsBusinessCalendarResponseSchema>;

export const OpsBusinessCalendarUpdateRequestSchema = z.object({
  isBusinessDay: z.boolean(),
  reason: z.string().nullable().optional(),
});
export type OpsBusinessCalendarUpdateRequest = z.infer<
  typeof OpsBusinessCalendarUpdateRequestSchema
>;

export const OpsBusinessCalendarUpdateResponseSchema = z.object({
  calendarDate: z.string(),
  isBusinessDay: z.boolean(),
  reason: z.string().nullable(),
});
export type OpsBusinessCalendarUpdateResponse = z.infer<
  typeof OpsBusinessCalendarUpdateResponseSchema
>;

export const OpsCompanyServiceInfoResponseSchema = z.object({
  items: z.array(
    z.object({
      infoId: z.number(),
      versionNo: z.number(),
      businessName: z.string(),
      representativeName: z.string(),
      businessNumber: z.string(),
      address: z.string(),
      contactPhone: z.string(),
      ecommerceNotice: z.string().nullable(),
      supportEmail: z.string(),
      supportHours: z.string(),
      emergencyContact: z.string(),
      privacyOfficer: z.string(),
      privacyContact: z.string(),
      privacyRequestPath: z.string(),
      cancellationPath: z.string(),
      inquiryDeliveryTestedAt: z.string().nullable(),
      reviewedByOperatorId: z.number().nullable(),
      publishedAt: z.string(),
    }),
  ),
  launchReady: z.boolean(),
  missingItems: z.array(z.string()),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsCompanyServiceInfoResponse = z.infer<typeof OpsCompanyServiceInfoResponseSchema>;

export const OpsCompanyServiceInfoRequestSchema = z.object({
  businessName: z.string(),
  representativeName: z.string(),
  businessNumber: z.string(),
  address: z.string(),
  contactPhone: z.string(),
  ecommerceNotice: z.string().nullable().optional(),
  supportEmail: z.string(),
  supportHours: z.string(),
  emergencyContact: z.string(),
  privacyOfficer: z.string(),
  privacyContact: z.string(),
  privacyRequestPath: z.string(),
  cancellationPath: z.string(),
});
export type OpsCompanyServiceInfoRequest = z.infer<typeof OpsCompanyServiceInfoRequestSchema>;

export const OpsCompanyServiceInfoCreateResponseSchema = z.object({
  infoId: z.number(),
  versionNo: z.number(),
  inquiryDeliveryTestedAt: z.string().nullable(),
  reviewedByOperatorId: z.number().nullable(),
  publishedAt: z.string().nullable(),
});
export type OpsCompanyServiceInfoCreateResponse = z.infer<
  typeof OpsCompanyServiceInfoCreateResponseSchema
>;

export const DeletionQueueListResponseSchema = z.object({
  items: z.array(
    z.object({
      queueId: z.number(),
      targetType: z.string(),
      targetId: z.number(),
      officeId: z.number().nullable(),
      reason: z.string(),
      scheduledAt: z.string(),
      executedAt: z.string().nullable(),
      executedByOperatorId: z.number().nullable(),
      targetCount: z.number(),
      excludedCount: z.number(),
      result: z.enum(["SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
      storageResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
      searchIndexResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
      fileResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
      temporaryExportResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
      backupExpiresAt: z.string().nullable(),
      retryCount: z.number(),
      exclusionReason: z.string().nullable(),
      holdApprovedByOperatorId: z.number().nullable(),
      holdExpiresAt: z.string().nullable(),
      exclusionReviewedAt: z.string().nullable(),
      verifiedByOperatorId: z.number().nullable(),
      verifiedAt: z.string().nullable(),
      verificationEvidence: z.string().nullable(),
      cancelledAt: z.string().nullable(),
      cancelledByOperatorId: z.number().nullable(),
      cancelReason: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type DeletionQueueListResponse = z.infer<typeof DeletionQueueListResponseSchema>;

export const DeletionQueueDetailResponseSchema = z.object({
  queueId: z.number(),
  targetType: z.string(),
  targetId: z.number(),
  officeId: z.number().nullable(),
  reason: z.string(),
  scheduledAt: z.iso.datetime({ offset: true }),
  executedAt: z.iso.datetime({ offset: true }).nullable(),
  executedByOperatorId: z.number().nullable(),
  targetCount: z.number(),
  excludedCount: z.number(),
  result: z.enum(["SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  storageResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  searchIndexResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  fileResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  temporaryExportResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  backupExpiresAt: z.iso.datetime({ offset: true }).nullable(),
  retryCount: z.number(),
  exclusionReason: z.string().nullable(),
  holdApprovedByOperatorId: z.number().nullable(),
  holdExpiresAt: z.iso.datetime({ offset: true }).nullable(),
  exclusionReviewedAt: z.iso.datetime({ offset: true }).nullable(),
  verifiedByOperatorId: z.number().nullable(),
  verifiedAt: z.iso.datetime({ offset: true }).nullable(),
  verificationEvidence: z.string().nullable(),
  cancelledAt: z.iso.datetime({ offset: true }).nullable(),
  cancelledByOperatorId: z.number().nullable(),
  cancelReason: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type DeletionQueueDetailResponse = z.infer<typeof DeletionQueueDetailResponseSchema>;

export const DeletionQueueExcludeRequestSchema = z.object({
  exclusionReason: z.string(),
  holdExpiresAt: z.iso.datetime({ offset: true }),
  exclusionReviewedAt: z.iso.datetime({ offset: true }),
  approvedByOperatorId: z.number(),
});
export type DeletionQueueExcludeRequest = z.infer<typeof DeletionQueueExcludeRequestSchema>;

export const DeletionQueueExcludeResponseSchema = z.object({
  queueId: z.number(),
  result: z.string(),
  exclusionReason: z.string(),
  holdExpiresAt: z.string(),
  exclusionReviewedAt: z.string(),
});
export type DeletionQueueExcludeResponse = z.infer<typeof DeletionQueueExcludeResponseSchema>;

export const DeletionQueueExecuteResponseSchema = z.object({
  queueId: z.number(),
  result: z.enum(["SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  executedAt: z.string(),
  storageResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  searchIndexResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  fileResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  temporaryExportResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  retryCount: z.number(),
  verifiedAt: z.string().nullable(),
});
export type DeletionQueueExecuteResponse = z.infer<typeof DeletionQueueExecuteResponseSchema>;

export const DeletionQueuePreviewResponseSchema = z.object({
  targetCount: z.number(),
  excludedCount: z.number(),
  storageTargets: z.array(z.object({ targetType: z.string(), targetId: z.number() })),
  searchIndexTargets: z.array(z.object({ targetType: z.string(), targetId: z.number() })),
  fileTargets: z.array(z.object({ objectKey: z.string() })),
  temporaryExportTargets: z.array(z.object({ objectKey: z.string() })),
  holdReasons: z.array(z.string()),
});
export type DeletionQueuePreviewResponse = z.infer<typeof DeletionQueuePreviewResponseSchema>;

export const DeletionQueueVerifyRequestSchema = z.object({
  storageResult: z.string(),
  searchIndexResult: z.string(),
  fileResult: z.string(),
  temporaryExportResult: z.string(),
  backupExpiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  evidence: z.string(),
});
export type DeletionQueueVerifyRequest = z.infer<typeof DeletionQueueVerifyRequestSchema>;

export const DeletionQueueVerifyResponseSchema = z.object({
  queueId: z.number(),
  result: z.enum(["SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  storageResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  searchIndexResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  fileResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  temporaryExportResult: z.enum(["PENDING", "SUCCESS", "FAILED", "EXCLUDED"]).nullable(),
  backupExpiresAt: z.string().nullable(),
  verifiedByOperatorId: z.number().nullable(),
  verifiedAt: z.string().nullable(),
});
export type DeletionQueueVerifyResponse = z.infer<typeof DeletionQueueVerifyResponseSchema>;

export const OpsEnterpriseLeadListResponseSchema = z.object({
  items: z.array(
    z.object({
      leadId: z.number(),
      companyName: z.string(),
      status: z.enum([
        "RECEIVED",
        "ASSIGNED",
        "CONSULTING",
        "QUOTED",
        "ACCEPTED",
        "REJECTED",
        "CONTRACTED",
        "CLOSED",
      ]),
      assignedOperatorId: z.number().nullable(),
      assignedOperatorName: z.string().nullable(),
      contactName: z.string(),
      branchCount: z.number(),
      expectedSeats: z.number(),
      migrationNeeded: z.boolean(),
      quoteAmount: z.number().nullable(),
      quoteExpiresAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      version: z.number(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsEnterpriseLeadListResponse = z.infer<typeof OpsEnterpriseLeadListResponseSchema>;

export const OperatorEnterpriseLeadQuoteRequestSchema = z.object({
  officeCount: z.number(),
  seatCount: z.number(),
  quoteAmount: z.number(),
  serviceScope: z.string(),
  taxAmount: z.number(),
  deliveryDueAt: z.iso.date(),
  paymentMethod: z.string(),
  refundTerms: z.string(),
});
export type OperatorEnterpriseLeadQuoteRequest = z.infer<
  typeof OperatorEnterpriseLeadQuoteRequestSchema
>;

export const EnterpriseLeadQuoteResponseSchema = z.object({
  quoteId: z.number(),
  quoteVersion: z.number(),
  quoteExpiresAt: z.string(),
  leadId: z.number(),
  leadStatus: z.string(),
  supersededQuoteId: z.number().nullable(),
  updatedAt: z.string(),
  version: z.number(),
});
export type EnterpriseLeadQuoteResponse = z.infer<typeof EnterpriseLeadQuoteResponseSchema>;

export const OpsHomeResponseSchema = z.object({
  pendingReviewCount: z.number(),
  overdueReviewCount: z.number(),
  unassignedInquiryCount: z.number(),
  paymentPendingCount: z.number(),
  refundFailedCount: z.number(),
  migrationReviewPendingCount: z.number(),
  privacyDeadlineApproachingCount: z.number(),
  deletionFailedCount: z.number(),
  activeIncidentCount: z.number(),
  execSummary: z
    .object({
      trialOfficeCount: z.number(),
      activeOfficeCount: z.number(),
      pastDueOfficeCount: z.number(),
      endedOfficeCount: z.number(),
      netCollectedAmount: z.number(),
      asOf: z.iso.datetime({ offset: true }),
    })
    .optional(),
});
export type OpsHomeResponse = z.infer<typeof OpsHomeResponseSchema>;

export const OpsImportSupportRequestListResponseSchema = z.object({
  items: z.array(
    z.object({
      requestId: z.number(),
      officeId: z.number(),
      importBatchId: z.number(),
      assignedOperatorName: z.string().nullable(),
      sourceSystem: z.string(),
      estimatedRowCount: z.number().nullable(),
      quoteAmount: z.number().nullable(),
      status: z.enum([
        "REQUESTED",
        "QUOTED",
        "ACCEPTED",
        "PAID",
        "PROCESSING",
        "REVIEW",
        "APPROVED",
        "DELIVERED",
        "CANCELLED",
        "REJECTED",
      ]),
      requestedAt: z.string(),
      deliveredAt: z.string().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsImportSupportRequestListResponse = z.infer<
  typeof OpsImportSupportRequestListResponseSchema
>;

export const OpsImportSupportDeliverResponseSchema = z.object({
  requestId: z.number(),
  officeId: z.number(),
  sourceSystem: z.string(),
  estimatedRowCount: z.number().nullable(),
  quoteAmount: z.number().nullable(),
  status: z.string(),
  requestedAt: z.string(),
  deliveredAt: z.string().nullable(),
});
export type OpsImportSupportDeliverResponse = z.infer<typeof OpsImportSupportDeliverResponseSchema>;

export const ImportSupportQuoteRequestSchema = z.object({
  quoteAmount: z.number(),
  scopeNote: z.string().nullable().optional(),
});
export type ImportSupportQuoteRequest = z.infer<typeof ImportSupportQuoteRequestSchema>;

export const OpsImportSupportQuoteResponseSchema = z.object({
  requestId: z.number(),
  officeId: z.number(),
  sourceSystem: z.string(),
  estimatedRowCount: z.number().nullable(),
  quoteAmount: z.number().nullable(),
  status: z.string(),
  requestedAt: z.string(),
  deliveredAt: z.string().nullable(),
});
export type OpsImportSupportQuoteResponse = z.infer<typeof OpsImportSupportQuoteResponseSchema>;

export const OpsIncidentListResponseSchema = z.object({
  items: z.array(
    z.object({
      incidentId: z.number(),
      title: z.string(),
      affectedServices: z.array(z.string()),
      affectedOffices: z.array(z.number()),
      status: z.enum(["DETECTED", "CONFIRMED", "RESPONDING", "RECOVERED", "CLOSED"]),
      detectedAt: z.string(),
      startedAt: z.string().nullable(),
      recoveredAt: z.string().nullable(),
      closedAt: z.string().nullable(),
      assignedOperatorId: z.number().nullable(),
      rootCause: z.string().nullable(),
      responseActions: z.string().nullable(),
      customerNotice: z.string().nullable(),
      preventionTasks: z.string().nullable(),
      summary: z.string().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsIncidentListResponse = z.infer<typeof OpsIncidentListResponseSchema>;

export const OpsIncidentCreateRequestSchema = z.object({
  title: z.string(),
  affectedServices: z.array(z.string()),
  affectedOfficeIds: z.array(z.number()).nullable().optional(),
  startedAt: z.iso.datetime({ offset: true }),
  rootCause: z.string().nullable().optional(),
  assignedOperatorId: z.number().nullable().optional(),
});
export type OpsIncidentCreateRequest = z.infer<typeof OpsIncidentCreateRequestSchema>;

export const OpsIncidentCreateResponseSchema = z.object({
  incidentId: z.number(),
  title: z.string(),
  status: z.enum(["DETECTED", "CONFIRMED", "RESPONDING", "RECOVERED", "CLOSED"]),
  detectedAt: z.string(),
  startedAt: z.string().nullable(),
  assignedOperatorId: z.number().nullable(),
});
export type OpsIncidentCreateResponse = z.infer<typeof OpsIncidentCreateResponseSchema>;

export const OpsIncidentUpdateRequestSchema = z.object({
  status: z.string(),
  recoveredAt: z.iso.datetime({ offset: true }).nullable().optional(),
  rootCause: z.string().nullable().optional(),
  responseActions: z.string().nullable().optional(),
  customerNotice: z.string().nullable().optional(),
  preventionTasks: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  assignedOperatorId: z.number().nullable().optional(),
});
export type OpsIncidentUpdateRequest = z.infer<typeof OpsIncidentUpdateRequestSchema>;

export const OpsIncidentUpdateResponseSchema = z.object({
  incidentId: z.number(),
  title: z.string(),
  affectedServices: z.array(z.string()),
  affectedOffices: z.array(z.number()),
  status: z.enum(["DETECTED", "CONFIRMED", "RESPONDING", "RECOVERED", "CLOSED"]),
  detectedAt: z.string(),
  startedAt: z.string().nullable(),
  recoveredAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  assignedOperatorId: z.number().nullable(),
  rootCause: z.string().nullable(),
  responseActions: z.string().nullable(),
  customerNotice: z.string().nullable(),
  preventionTasks: z.string().nullable(),
  summary: z.string().nullable(),
});
export type OpsIncidentUpdateResponse = z.infer<typeof OpsIncidentUpdateResponseSchema>;

export const OpsIntegrationListResponseSchema = z.object({
  items: z.array(
    z.object({
      integrationId: z.number(),
      environment: z.enum(["TEST", "PRODUCTION"]),
      provider: z.string(),
      functionCode: z.string(),
      enabled: z.boolean(),
      secretReferenceId: z.string(),
      maskedConnection: z.string(),
      processingRegion: z.string().nullable(),
      retentionPolicy: z.string(),
      contractStatus: z.enum(["PENDING", "SIGNED", "EXPIRED", "TERMINATED"]),
      consentStatus: z.enum(["NOT_REQUIRED", "PENDING", "GRANTED", "WITHDRAWN"]),
      contractNoticeReviewedAt: z.string().nullable(),
      lastCheckResult: z.enum(["SUCCESS", "FAILED", "NOT_TESTED"]).nullable(),
      lastSuccessAt: z.string().nullable(),
      assignedOperatorId: z.number().nullable(),
      approvedByOperatorId: z.number().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsIntegrationListResponse = z.infer<typeof OpsIntegrationListResponseSchema>;

export const OpsIntegrationUpdateRequestSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().nullable().optional(),
  processingRegion: z.string().nullable().optional(),
  retentionPolicy: z.string().nullable().optional(),
  contractStatus: z.string().nullable().optional(),
  consentStatus: z.string().nullable().optional(),
  contractNoticeReviewed: z.boolean().optional(),
});
export type OpsIntegrationUpdateRequest = z.infer<typeof OpsIntegrationUpdateRequestSchema>;

export const OpsIntegrationUpdateResponseSchema = z.object({
  integrationId: z.number(),
  environment: z.enum(["TEST", "PRODUCTION"]),
  provider: z.string(),
  functionCode: z.string(),
  enabled: z.boolean(),
  maskedConnection: z.string(),
  processingRegion: z.string().nullable(),
  retentionPolicy: z.string(),
  contractStatus: z.enum(["PENDING", "SIGNED", "EXPIRED", "TERMINATED"]),
  consentStatus: z.enum(["NOT_REQUIRED", "PENDING", "GRANTED", "WITHDRAWN"]),
  contractNoticeReviewedAt: z.string().nullable(),
  lastCheckResult: z.enum(["SUCCESS", "FAILED", "NOT_TESTED"]).nullable(),
  lastSuccessAt: z.string().nullable(),
});
export type OpsIntegrationUpdateResponse = z.infer<typeof OpsIntegrationUpdateResponseSchema>;

export const OperatorMemberListResponseSchema = z.object({
  items: z.array(
    z.object({
      userId: z.number(),
      displayName: z.string(),
      accountStatus: z.string(),
      officeName: z.string().nullable().optional(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OperatorMemberListResponse = z.infer<typeof OperatorMemberListResponseSchema>;

export const OperatorMemberDetailResponseSchema = z.object({
  userId: z.number(),
  displayName: z.string(),
  accountStatus: z.string(),
  withdrawnAt: z.iso.datetime({ offset: true }).nullable().optional(),
  currentMembership: z
    .object({ officeId: z.number(), officeName: z.string(), role: z.string() })
    .nullable()
    .optional(),
  pendingRequestSummary: z.object({ type: z.string(), status: z.string() }).nullable().optional(),
  loginMethods: z.array(z.string()),
  lastLoginAt: z.iso.datetime({ offset: true }).nullable().optional(),
  loginLockedUntil: z.iso.datetime({ offset: true }).nullable().optional(),
  sessions: z.array(
    z.object({
      sessionId: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
      lastSeenAt: z.iso.datetime({ offset: true }),
      deviceSummary: z.string(),
    }),
  ),
  securityEvents: z.array(
    z.object({
      eventType: z.string(),
      occurredAt: z.iso.datetime({ offset: true }),
      scope: z.string(),
      reason: z.string(),
      reviewAt: z.iso.datetime({ offset: true }),
      actorOperatorName: z.string(),
    }),
  ),
});
export type OperatorMemberDetailResponse = z.infer<typeof OperatorMemberDetailResponseSchema>;

export const MemberEmergencySuspendRequestSchema = z.object({
  reason: z.string(),
  scope: z.string(),
  sessionId: z.string().nullable().optional(),
  reviewAt: z.iso.datetime({ offset: true }),
});
export type MemberEmergencySuspendRequest = z.infer<typeof MemberEmergencySuspendRequestSchema>;

export const MemberEmergencySuspendResponseSchema = z.object({
  userId: z.number(),
  scope: z.enum(["ALL_SESSIONS", "SPECIFIC_SESSION"]),
  suspendedAt: z.string(),
  reviewAt: z.string(),
});
export type MemberEmergencySuspendResponse = z.infer<typeof MemberEmergencySuspendResponseSchema>;

export const OpsOfficeChangeListResponseSchema = z.object({
  items: z.array(
    z.object({
      requestId: z.number(),
      officeId: z.number(),
      requestedByMembershipId: z.number(),
      changeType: z.enum(["ADDRESS", "REGISTRATION_INFO", "REPRESENTATIVE"]),
      requestedValues: z.object({ address: z.string().optional() }),
      status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED"]),
      reviewedAt: z.string().nullable(),
      rejectionReason: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsOfficeChangeListResponse = z.infer<typeof OpsOfficeChangeListResponseSchema>;

export const OpsOfficeChangeApproveResponseSchema = z.object({
  requestId: z.number(),
  status: z.string(),
  reviewedAt: z.string(),
  officeId: z.number(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OpsOfficeChangeApproveResponse = z.infer<typeof OpsOfficeChangeApproveResponseSchema>;

export const OpsOfficeChangeRejectResponseSchema = z.object({
  requestId: z.number(),
  status: z.string(),
  reviewedAt: z.string(),
  officeId: z.number(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OpsOfficeChangeRejectResponse = z.infer<typeof OpsOfficeChangeRejectResponseSchema>;

export const OperatorRegistrationListResponseSchema = z.object({
  items: z.array(
    z.object({
      registrationId: z.number(),
      requestedOfficeName: z.string(),
      businessRegistrationNumber: z.string(),
      status: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OperatorRegistrationListResponse = z.infer<
  typeof OperatorRegistrationListResponseSchema
>;

export const OperatorRegistrationDetailResponseSchema = z.object({
  registrationId: z.number(),
  officeId: z.number().nullable(),
  reviewDueAt: z.iso.datetime({ offset: true }).nullable(),
  applicantUserId: z.number(),
  businessRegistrationNumber: z.string(),
  realEstateLicenseNumber: z.string(),
  requestedOfficeName: z.string(),
  requestedRepresentativeName: z.string(),
  requestedRepresentativePhone: z.string(),
  requestedAddress: z.string(),
  status: z.string(),
  hasEvidence: z.boolean(),
  entityType: z.string(),
  registrationAuthority: z.string(),
  applicantRegistrationRelation: z.string(),
  currentRevisionNo: z.number(),
  revisions: z.array(
    z.object({
      revisionNo: z.number(),
      submittedAt: z.iso.datetime({ offset: true }),
      requestedOfficeName: z.string(),
      requestedAddress: z.string(),
      evidenceTypes: z.array(z.string()),
    }),
  ),
  reviewChecklist: z.array(
    z.object({
      itemCode: z.string(),
      checked: z.boolean(),
      checkedByOperatorName: z.string().nullable().optional(),
      checkedAt: z.iso.datetime({ offset: true }).nullable().optional(),
    }),
  ),
  canApprove: z.boolean(),
  rejectionReason: z.string().nullable().optional(),
  statusHistory: z.array(
    z.object({
      historyId: z.number(),
      fromStatus: z.string().nullable().optional(),
      toStatus: z.string(),
      changedByType: z.string(),
      changedByOperatorId: z.number().nullable().optional(),
      reason: z.string().nullable().optional(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
});
export type OperatorRegistrationDetailResponse = z.infer<
  typeof OperatorRegistrationDetailResponseSchema
>;

export const OpsRegistrationApproveResponseSchema = z.object({
  registrationId: z.number(),
  status: z.string(),
  officeId: z.number(),
  currentRevisionNo: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OpsRegistrationApproveResponse = z.infer<typeof OpsRegistrationApproveResponseSchema>;

export const EvidenceDownloadUrlResponseSchema = z.object({
  downloadUrl: z.string(),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type EvidenceDownloadUrlResponse = z.infer<typeof EvidenceDownloadUrlResponseSchema>;

export const OpsRegistrationRejectResponseSchema = z.object({
  registrationId: z.number(),
  status: z.string(),
  officeId: z.number().nullable(),
  currentRevisionNo: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OpsRegistrationRejectResponse = z.infer<typeof OpsRegistrationRejectResponseSchema>;

export const OpsRegistrationSupplementResponseSchema = z.object({
  registrationId: z.number(),
  status: z.string(),
  officeId: z.number().nullable(),
  currentRevisionNo: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OpsRegistrationSupplementResponse = z.infer<
  typeof OpsRegistrationSupplementResponseSchema
>;

export const OperatorOfficeListResponseSchema = z.object({
  items: z.array(
    z.object({
      officeId: z.number(),
      name: z.string(),
      businessRegistrationNumber: z.string(),
      realEstateLicenseNumber: z.string(),
      registrationAuthority: z.string(),
      address: z.string(),
      registrationStatus: z.string(),
      subscriptionStatus: z.string().nullable().optional(),
      approvedMembershipCount: z.number(),
      createdAt: z.iso.datetime({ offset: true }),
      updatedAt: z.iso.datetime({ offset: true }),
      version: z.number(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OperatorOfficeListResponse = z.infer<typeof OperatorOfficeListResponseSchema>;

export const OperatorOfficeDetailResponseSchema = z.object({
  officeId: z.number(),
  name: z.string(),
  representativeName: z.string(),
  businessRegistrationNumber: z.string(),
  realEstateLicenseNumber: z.string(),
  phone: z.string(),
  address: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  approvedMembershipCount: z.number(),
  registrationAuthority: z.string(),
  registrationStatus: z.string(),
  registrationHistory: z.array(
    z.object({
      fromStatus: z.string().nullable().optional(),
      toStatus: z.string(),
      changedByType: z.string(),
      reason: z.string().nullable().optional(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  members: z.array(
    z.object({
      membershipId: z.number(),
      displayName: z.string(),
      role: z.string(),
      status: z.string(),
    }),
  ),
  employmentRoster: z.object({ agentCount: z.number(), deputyCount: z.number() }),
  subscription: z
    .object({
      status: z.string(),
      plan: z.string(),
      trialEndsAt: z.iso.datetime({ offset: true }).nullable().optional(),
      currentPeriodEnd: z.iso.datetime({ offset: true }).nullable(),
      pastDueSince: z.iso.datetime({ offset: true }).nullable().optional(),
    })
    .nullable()
    .optional(),
  openInquiryCount: z.number(),
  returnGrant: z
    .object({
      grantId: z.number(),
      grantedAt: z.iso.datetime({ offset: true }),
      expiresAt: z.iso.datetime({ offset: true }),
      revokedAt: z.iso.datetime({ offset: true }).nullable().optional(),
    })
    .nullable()
    .optional(),
  archiveGrant: z
    .object({
      grantId: z.number(),
      grantedAt: z.iso.datetime({ offset: true }),
      expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
      terminatedAt: z.iso.datetime({ offset: true }).nullable().optional(),
    })
    .nullable()
    .optional(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OperatorOfficeDetailResponse = z.infer<typeof OperatorOfficeDetailResponseSchema>;

export const OpsRegistrationRejectRequestSchema = z.object({ reason: z.string() });
export type OpsRegistrationRejectRequest = z.infer<typeof OpsRegistrationRejectRequestSchema>;

export const OpsRegistrationSupplementRequestSchema = z.object({
  reason: z.string(),
  supplementDueAt: z.iso.datetime({ offset: true }),
});
export type OpsRegistrationSupplementRequest = z.infer<
  typeof OpsRegistrationSupplementRequestSchema
>;

export const OpsOfficeChangeRejectRequestSchema = z.object({ reason: z.string() });
export type OpsOfficeChangeRejectRequest = z.infer<typeof OpsOfficeChangeRejectRequestSchema>;

export const OpsOfficeRevokeRequestSchema = z.object({ reason: z.string() });
export type OpsOfficeRevokeRequest = z.infer<typeof OpsOfficeRevokeRequestSchema>;

export const OpsOfficeRevokeResponseSchema = z.object({
  officeId: z.number(),
  registrationId: z.number(),
  registrationStatus: z.string(),
});
export type OpsOfficeRevokeResponse = z.infer<typeof OpsOfficeRevokeResponseSchema>;

export const OpsOperatorListResponseSchema = z.object({
  items: z.array(
    z.object({
      operatorId: z.number(),
      name: z.string(),
      status: z.enum(["ACTIVE", "DISABLED"]),
      roles: z.array(z.string()),
      createdAt: z.string(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsOperatorListResponse = z.infer<typeof OpsOperatorListResponseSchema>;

export const OpsOperatorOptionListResponseSchema = z.object({
  items: z.array(
    z.object({ operatorId: z.number(), name: z.string(), roles: z.array(z.string()) }),
  ),
});
export type OpsOperatorOptionListResponse = z.infer<typeof OpsOperatorOptionListResponseSchema>;

export const OperatorRoleAssignRequestSchema = z.object({ roles: z.array(z.unknown()) });
export type OperatorRoleAssignRequest = z.infer<typeof OperatorRoleAssignRequestSchema>;

export const OperatorRoleAssignResponseSchema = z.object({
  operatorId: z.number(),
  name: z.string(),
  status: z.enum(["ACTIVE", "DISABLED"]),
  roles: z.array(z.string()),
  createdAt: z.string(),
});
export type OperatorRoleAssignResponse = z.infer<typeof OperatorRoleAssignResponseSchema>;

export const OpsPolicyDocumentListResponseSchema = z.object({
  items: z.array(
    z.object({
      documentId: z.number(),
      docType: z.enum([
        "TERMS",
        "PRIVACY",
        "PROCESSING_OUTSOURCING",
        "ARCHIVE",
        "REFUND",
        "SUBPROCESSORS",
        "PRICING",
      ]),
      version: z.string(),
      status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "ENDED"]),
      body: z.string(),
      changeSummary: z.string(),
      noticeAt: z.string().nullable(),
      requiresConsent: z.boolean(),
      effectiveAt: z.string().nullable(),
      publishedAt: z.string().nullable(),
      reviewedByOperatorId: z.number().nullable(),
      publishedByOperatorId: z.number().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsPolicyDocumentListResponse = z.infer<typeof OpsPolicyDocumentListResponseSchema>;

export const OpsPolicyDocumentCreateRequestSchema = z.object({
  docType: z.string(),
  version: z.string(),
  body: z.string(),
  changeSummary: z.string(),
  noticeAt: z.iso.datetime({ offset: true }),
  requiresConsent: z.boolean(),
  effectiveAt: z.iso.datetime({ offset: true }),
});
export type OpsPolicyDocumentCreateRequest = z.infer<typeof OpsPolicyDocumentCreateRequestSchema>;

export const OpsPolicyDocumentCreateResponseSchema = z.object({
  documentId: z.number(),
  docType: z.enum([
    "TERMS",
    "PRIVACY",
    "PROCESSING_OUTSOURCING",
    "ARCHIVE",
    "REFUND",
    "SUBPROCESSORS",
    "PRICING",
  ]),
  version: z.string(),
  status: z.string(),
  effectiveAt: z.string().nullable(),
});
export type OpsPolicyDocumentCreateResponse = z.infer<typeof OpsPolicyDocumentCreateResponseSchema>;

export const OpsPolicyDocumentPublishResponseSchema = z.object({
  documentId: z.number(),
  version: z.string(),
  status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "ENDED"]),
  publishedAt: z.string().nullable(),
});
export type OpsPolicyDocumentPublishResponse = z.infer<
  typeof OpsPolicyDocumentPublishResponseSchema
>;

export const OpsPriceScheduleListResponseSchema = z.object({
  items: z.array(
    z.object({
      scheduleId: z.number(),
      version: z.string(),
      soloAmount: z.number(),
      teamFirstExtra: z.number(),
      teamAfterFourExtra: z.number(),
      effectiveAt: z.string(),
      noticeAt: z.string().nullable(),
      status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "ACTIVE", "ENDED"]),
      approvedByOperatorId: z.number().nullable(),
      createdAt: z.string(),
      audience: z.enum(["STANDARD", "START_CUSTOMER"]),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsPriceScheduleListResponse = z.infer<typeof OpsPriceScheduleListResponseSchema>;

export const OpsPriceScheduleCreateRequestSchema = z.object({
  soloAmount: z.number(),
  teamFirstExtra: z.number(),
  teamAfterFourExtra: z.number(),
  effectiveAt: z.iso.datetime({ offset: true }),
  noticeAt: z.iso.datetime({ offset: true }),
  audience: z.enum(["STANDARD", "START_CUSTOMER"]).optional(),
});
export type OpsPriceScheduleCreateRequest = z.infer<typeof OpsPriceScheduleCreateRequestSchema>;

export const OpsPriceScheduleCreateResponseSchema = z.object({
  scheduleId: z.number(),
  version: z.string(),
  status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "ACTIVE", "ENDED"]),
  effectiveAt: z.string(),
  noticeAt: z.string().nullable(),
  createdAt: z.string(),
  audience: z.enum(["STANDARD", "START_CUSTOMER"]),
});
export type OpsPriceScheduleCreateResponse = z.infer<typeof OpsPriceScheduleCreateResponseSchema>;

export const OpsPrivacyIncidentListResponseSchema = z.object({
  items: z.array(
    z.object({
      privacyIncidentId: z.number(),
      incidentLogId: z.number(),
      affectedScope: z.string(),
      reportRequirement: z.string(),
      noticeRequirement: z.string(),
      reportDueAt: z.string().nullable(),
      noticeDueAt: z.string().nullable(),
      responseEvidence: z.string().nullable(),
      assignedOperatorId: z.number(),
      createdAt: z.string(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsPrivacyIncidentListResponse = z.infer<typeof OpsPrivacyIncidentListResponseSchema>;

export const OpsPrivacyIncidentCreateRequestSchema = z.object({
  incidentLogId: z.number(),
  affectedScope: z.string(),
  reportRequirement: z.string(),
  noticeRequirement: z.string(),
  reportDueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  noticeDueAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type OpsPrivacyIncidentCreateRequest = z.infer<typeof OpsPrivacyIncidentCreateRequestSchema>;

export const OpsPrivacyIncidentCreateResponseSchema = z.object({
  privacyIncidentId: z.number(),
  incidentLogId: z.number(),
  reportDueAt: z.string().nullable(),
  noticeDueAt: z.string().nullable(),
  assignedOperatorId: z.number(),
  createdAt: z.string(),
});
export type OpsPrivacyIncidentCreateResponse = z.infer<
  typeof OpsPrivacyIncidentCreateResponseSchema
>;

export const OpsPrivacyRequestListResponseSchema = z.object({
  items: z.array(
    z.object({
      requestId: z.number(),
      officeId: z.number().nullable(),
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
      legalBasis: z.string(),
      requestScope: z.string(),
      legalDueAt: z.string(),
      internalDueAt: z.string(),
      dueState: z.enum(["ON_TRACK", "APPROACHING", "OVERDUE"]).nullable(),
      decisionReason: z.string().nullable(),
      assignedOperatorId: z.number().nullable(),
      assignedOperatorName: z.string().nullable(),
      completedAt: z.string().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsPrivacyRequestListResponse = z.infer<typeof OpsPrivacyRequestListResponseSchema>;

export const PrivacyRequestProcessRequestSchema = z.object({
  action: z.string(),
  note: z.string().nullable().optional(),
  evidenceReference: z.string().nullable().optional(),
  identityStatus: z.string().nullable().optional(),
});
export type PrivacyRequestProcessRequest = z.infer<typeof PrivacyRequestProcessRequestSchema>;

export const OpsPrivacyRequestProcessResponseSchema = z.object({
  requestId: z.number(),
  eventId: z.number(),
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
  occurredAt: z.string(),
});
export type OpsPrivacyRequestProcessResponse = z.infer<
  typeof OpsPrivacyRequestProcessResponseSchema
>;

export const RawAccessRequestCreateRequestSchema = z.object({
  requestType: z.string(),
  targetType: z.string(),
  targetId: z.number(),
  purpose: z.string(),
  scope: z.string(),
  requestedExpiresMinutes: z.number(),
  basisType: z.string(),
  basisNote: z.string(),
  linkedInquiryId: z.number().nullable().optional(),
  officeId: z.number().nullable().optional(),
  beneficiaryOperatorId: z.number().nullable().optional(),
});
export type RawAccessRequestCreateRequest = z.infer<typeof RawAccessRequestCreateRequestSchema>;

export const RawAccessCreateResponseSchema = z.object({
  requestId: z.number(),
  requestType: z.enum(["RAW_VIEW", "RAW_DOWNLOAD"]),
  targetType: z.enum([
    "OFFICE",
    "MEMBER",
    "SUPPORT_INQUIRY",
    "IMPORT_BATCH",
    "OFFICE_REGISTRATION",
  ]),
  targetId: z.number().nullable(),
  purpose: z.string(),
  scope: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED", "INVALIDATED"]),
  beneficiaryOperatorId: z.number().nullable(),
  createdAt: z.string(),
});
export type RawAccessCreateResponse = z.infer<typeof RawAccessCreateResponseSchema>;

export const RawAccessApproveResponseSchema = z.object({
  requestId: z.number(),
  requestType: z.enum(["RAW_VIEW", "RAW_DOWNLOAD"]),
  status: z.string(),
  approvedAt: z.string(),
  expiresAt: z.string(),
});
export type RawAccessApproveResponse = z.infer<typeof RawAccessApproveResponseSchema>;

export const RawAccessExecuteResponseSchema = z.object({
  grantId: z.number(),
  approvalRequestId: z.number(),
  requestType: z.enum(["RAW_VIEW", "RAW_DOWNLOAD"]),
  executedAt: z.string(),
  expiresAt: z.string(),
  fileSize: z.number().nullable(),
  fileSha256: z.string().nullable(),
  downloadPath: z.string().nullable(),
});
export type RawAccessExecuteResponse = z.infer<typeof RawAccessExecuteResponseSchema>;

export const OpsRefundRequestListResponseSchema = z.object({
  items: z.array(
    z.object({
      refundId: z.number(),
      officeId: z.number(),
      invoiceId: z.number(),
      reasonCode: z.enum([
        "CANCELLATION",
        "AUTH_SUSPENSION",
        "DUPLICATE_CHARGE",
        "INCORRECT_CHARGE",
        "SERVICE_FAILURE",
        "LATE_APPROVAL",
        "POLICY_COMPENSATION",
      ]),
      requestedAt: z.string(),
      status: z.enum([
        "RECEIVED",
        "REVIEWING",
        "APPROVED",
        "REJECTED",
        "PROCESSING",
        "VERIFYING",
        "COMPLETED",
        "FAILED",
      ]),
      refundAmount: z.number().nullable(),
      entitlementAmount: z.number().nullable(),
      previousRefundAmount: z.number(),
      reservedAmount: z.number(),
      reviewedAt: z.string().nullable(),
      resolvedAt: z.string().nullable(),
      rejectionReason: z.string().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsRefundRequestListResponse = z.infer<typeof OpsRefundRequestListResponseSchema>;

export const OpsRefundExecuteResponseSchema = z.object({
  refundId: z.number(),
  status: z.enum([
    "RECEIVED",
    "REVIEWING",
    "APPROVED",
    "REJECTED",
    "PROCESSING",
    "VERIFYING",
    "COMPLETED",
    "FAILED",
  ]),
  failureReason: z.string().nullable(),
});
export type OpsRefundExecuteResponse = z.infer<typeof OpsRefundExecuteResponseSchema>;

export const RefundRequestReviewRequestSchema = z.object({
  decision: z.string(),
  note: z.string().nullable().optional(),
  reasonEventId: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
});
export type RefundRequestReviewRequest = z.infer<typeof RefundRequestReviewRequestSchema>;

export const OpsRefundReviewResponseSchema = z.object({
  refundId: z.number(),
  status: z.enum([
    "RECEIVED",
    "REVIEWING",
    "APPROVED",
    "REJECTED",
    "PROCESSING",
    "VERIFYING",
    "COMPLETED",
    "FAILED",
  ]),
  reviewedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  refundAmount: z.number().nullable(),
  entitlementAmount: z.number().nullable(),
  previousRefundAmount: z.number(),
  reservedAmount: z.number(),
});
export type OpsRefundReviewResponse = z.infer<typeof OpsRefundReviewResponseSchema>;

export const OpsReturnGrantListResponseSchema = z.object({
  items: z.array(
    z.object({
      grantId: z.number(),
      officeId: z.number(),
      grantedToUserId: z.number(),
      grantedAt: z.string(),
      expiresAt: z.string(),
      revokedAt: z.string().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsReturnGrantListResponse = z.infer<typeof OpsReturnGrantListResponseSchema>;

export const OpsSupportInquiryListResponseSchema = z.object({
  items: z.array(
    z.object({
      inquiryId: z.number(),
      officeId: z.number().nullable(),
      officeName: z.string().nullable(),
      authorUserId: z.number(),
      authorDisplayName: z.string(),
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
      assignedOperatorId: z.number().nullable(),
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
export type OpsSupportInquiryListResponse = z.infer<typeof OpsSupportInquiryListResponseSchema>;

export const SupportInquiryOperatorReplyRequestSchema = z.object({
  content: z.string(),
  needsCustomerReply: z.boolean(),
  closeAfterReply: z.boolean(),
});
export type SupportInquiryOperatorReplyRequest = z.infer<
  typeof SupportInquiryOperatorReplyRequestSchema
>;

export const OpsSupportInquiryAnswerResponseSchema = z.object({
  inquiryId: z.number(),
  status: z.string(),
  category: z.string(),
  priority: z.string(),
  responseDueAt: z.string(),
  answeredAt: z.string().nullable().optional(),
  closedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  messages: z.array(
    z.object({
      messageId: z.number(),
      visibility: z.enum(["PUBLIC", "INTERNAL"]),
      content: z.string(),
      createdAt: z.string(),
    }),
  ),
  attachments: z.array(z.unknown()),
  officeId: z.number().nullable(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OpsSupportInquiryAnswerResponse = z.infer<typeof OpsSupportInquiryAnswerResponseSchema>;

export const SupportInquiryAssignRequestSchema = z.object({ assigneeOperatorId: z.number() });
export type SupportInquiryAssignRequest = z.infer<typeof SupportInquiryAssignRequestSchema>;

export const OpsSupportInquiryAssignResponseSchema = z.object({
  inquiryId: z.number(),
  status: z.enum(["ASSIGNED", "WAITING_FOR_CUSTOMER", "ANSWERED"]),
  assigneeOperatorId: z.number(),
  officeId: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OpsSupportInquiryAssignResponse = z.infer<typeof OpsSupportInquiryAssignResponseSchema>;

export const OpsSupportInquiryAttachmentResponseSchema = z.object({
  attachmentId: z.number(),
  inquiryId: z.number(),
  messageId: z.number().nullable(),
  scanStatus: z.enum(["PENDING", "CLEAN", "REJECTED"]),
  fileName: z.string(),
  mediaType: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string(),
});
export type OpsSupportInquiryAttachmentResponse = z.infer<
  typeof OpsSupportInquiryAttachmentResponseSchema
>;

export const OpsSupportAttachmentDownloadResponseSchema = z.object({});
export type OpsSupportAttachmentDownloadResponse = z.infer<
  typeof OpsSupportAttachmentDownloadResponseSchema
>;

export const SupportInquiryOperatorNoteRequestSchema = z.object({ content: z.string() });
export type SupportInquiryOperatorNoteRequest = z.infer<
  typeof SupportInquiryOperatorNoteRequestSchema
>;

export const OpsSupportInquiryNoteResponseSchema = z.object({
  messageId: z.number(),
  inquiryId: z.number(),
  visibility: z.string(),
  content: z.string(),
  createdAt: z.string(),
  officeId: z.number().nullable(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OpsSupportInquiryNoteResponse = z.infer<typeof OpsSupportInquiryNoteResponseSchema>;

export const OpsSystemJobListResponseSchema = z.object({
  items: z.array(
    z.object({
      runId: z.number(),
      jobName: z.string(),
      jobType: z.enum([
        "CHARGE_RETRY",
        "ANNOUNCEMENT_PUBLISH",
        "INTEGRATION_CHECK",
        "LEGAL_RETENTION",
        "OTHER",
      ]),
      rerunRoles: z.array(z.string()),
      officeId: z.number().nullable(),
      officeName: z.string().nullable(),
      status: z.enum(["RUNNING", "SUCCESS", "FAILED"]),
      scheduledAt: z.string().nullable(),
      startedAt: z.string(),
      finishedAt: z.string().nullable(),
      attemptCount: z.number(),
      errorCode: z.string().nullable(),
      nextRunAt: z.string().nullable(),
      assignedOperatorId: z.number().nullable(),
      assignedOperatorName: z.string().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsSystemJobListResponse = z.infer<typeof OpsSystemJobListResponseSchema>;

export const OpsSystemJobRerunRequestSchema = z.object({ runId: z.number() });
export type OpsSystemJobRerunRequest = z.infer<typeof OpsSystemJobRerunRequestSchema>;

export const OpsSystemJobRerunResponseSchema = z.object({
  runId: z.number(),
  jobName: z.string(),
  status: z.enum(["RUNNING", "SUCCESS", "FAILED"]),
  startedAt: z.string(),
  attemptCount: z.number(),
  nextRunAt: z.string().nullable(),
});
export type OpsSystemJobRerunResponse = z.infer<typeof OpsSystemJobRerunResponseSchema>;

export const OpsTrialEventListResponseSchema = z.object({
  items: z.array(
    z.object({
      eventId: z.number(),
      name: z.string(),
      startsAt: z.string(),
      endsAt: z.string(),
      officeCreatedDuring: z.boolean(),
      firstApplicationDuring: z.boolean(),
      freeEndMode: z.enum(["DURATION", "FIXED_END"]),
      fixedFreeEndsAt: z.string().nullable(),
      status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "ACTIVE", "ENDED"]),
      approvedByOperatorId: z.number().nullable(),
      createdAt: z.string(),
      audience: z.enum(["GENERAL", "START_CUSTOMER"]),
      maxOffices: z.number().nullable().optional(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsTrialEventListResponse = z.infer<typeof OpsTrialEventListResponseSchema>;

export const OpsTrialEventCreateRequestSchema = z.object({
  name: z.string(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  officeCreatedDuring: z.boolean().optional(),
  firstApplicationDuring: z.boolean().optional(),
  freeEndMode: z.enum(["DURATION", "FIXED_END"]).optional(),
  fixedFreeEndsAt: z.string().nullable().optional(),
  audience: z.enum(["GENERAL", "START_CUSTOMER"]).optional(),
  maxOffices: z.number().nullable().optional(),
});
export type OpsTrialEventCreateRequest = z.infer<typeof OpsTrialEventCreateRequestSchema>;

export const OpsTrialEventCreateResponseSchema = z.object({
  eventId: z.number(),
  name: z.string(),
  status: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  freeEndMode: z.enum(["DURATION", "FIXED_END"]),
  fixedFreeEndsAt: z.string().nullable(),
  createdAt: z.string(),
  audience: z.enum(["GENERAL", "START_CUSTOMER"]),
  maxOffices: z.number().nullable().optional(),
});
export type OpsTrialEventCreateResponse = z.infer<typeof OpsTrialEventCreateResponseSchema>;

export const OperatorInvitationCreateRequestSchema = z.object({
  inviteeName: z.string(),
  inviteeEmail: z.string(),
  roles: z.array(z.string()),
});
export type OperatorInvitationCreateRequest = z.infer<typeof OperatorInvitationCreateRequestSchema>;

export const OperatorInvitationCreateResponseSchema = z.object({
  invitationId: z.number(),
  inviteeName: z.string(),
  inviteeEmail: z.string(),
  roles: z.array(z.string()),
  status: z.string(),
  expiresAt: z.iso.datetime({ offset: true }),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OperatorInvitationCreateResponse = z.infer<
  typeof OperatorInvitationCreateResponseSchema
>;

export const OperatorInvitationListResponseSchema = z.object({
  items: z.array(
    z.object({
      invitationId: z.number(),
      inviteeName: z.string(),
      inviteeEmail: z.string(),
      roles: z.array(z.string()),
      status: z.string(),
      expiresAt: z.iso.datetime({ offset: true }),
      invitedByOperatorId: z.number(),
      invitedByName: z.string(),
      acceptedOperatorId: z.number().nullable().optional(),
      acceptedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      cancelledAt: z.iso.datetime({ offset: true }).nullable().optional(),
      createdAt: z.iso.datetime({ offset: true }),
      version: z.number(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OperatorInvitationListResponse = z.infer<typeof OperatorInvitationListResponseSchema>;

export const OperatorInvitationCancelResponseSchema = z.object({
  invitationId: z.number(),
  status: z.string(),
  cancelledAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OperatorInvitationCancelResponse = z.infer<
  typeof OperatorInvitationCancelResponseSchema
>;

export const OperatorInvitationPreviewRequestSchema = z.object({ token: z.string() });
export type OperatorInvitationPreviewRequest = z.infer<
  typeof OperatorInvitationPreviewRequestSchema
>;

export const OperatorInvitationPreviewResponseSchema = z.object({
  inviteeName: z.string(),
  roles: z.array(z.string()),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type OperatorInvitationPreviewResponse = z.infer<
  typeof OperatorInvitationPreviewResponseSchema
>;

export const OperatorInvitationKakaoStartRequestSchema = z.object({ token: z.string() });
export type OperatorInvitationKakaoStartRequest = z.infer<
  typeof OperatorInvitationKakaoStartRequestSchema
>;

export const OperatorInvitationKakaoStartResponseSchema = z.object({
  authorizationUrl: z.string(),
});
export type OperatorInvitationKakaoStartResponse = z.infer<
  typeof OperatorInvitationKakaoStartResponseSchema
>;

export const OperatorInvitationKakaoCallbackResponseSchema = z.object({});
export type OperatorInvitationKakaoCallbackResponse = z.infer<
  typeof OperatorInvitationKakaoCallbackResponseSchema
>;

export const OperatorMfaEnrollmentResponseSchema = z.object({
  otpauthUri: z.string(),
  secret: z.string(),
  enrollmentExpiresAt: z.iso.datetime({ offset: true }),
});
export type OperatorMfaEnrollmentResponse = z.infer<typeof OperatorMfaEnrollmentResponseSchema>;

export const OperatorInvitationAcceptRequestSchema = z.object({ otpCode: z.string() });
export type OperatorInvitationAcceptRequest = z.infer<typeof OperatorInvitationAcceptRequestSchema>;

export const OperatorInvitationAcceptResponseSchema = z.object({
  operatorId: z.number(),
  name: z.string(),
  roles: z.array(z.string()),
  acceptedAt: z.iso.datetime({ offset: true }),
});
export type OperatorInvitationAcceptResponse = z.infer<
  typeof OperatorInvitationAcceptResponseSchema
>;

export const OpsMfaVerifyResponseSchema = z.object({
  operatorId: z.number(),
  name: z.string(),
  roles: z.array(z.string()),
  idleExpiresAt: z.iso.datetime({ offset: true }),
  absoluteExpiresAt: z.iso.datetime({ offset: true }),
});
export type OpsMfaVerifyResponse = z.infer<typeof OpsMfaVerifyResponseSchema>;

export const OpsStepUpResponseSchema = z.object({
  stepUpValidUntil: z.iso.datetime({ offset: true }),
});
export type OpsStepUpResponse = z.infer<typeof OpsStepUpResponseSchema>;

export const OperatorDisableRequestSchema = z.object({ reason: z.string() });
export type OperatorDisableRequest = z.infer<typeof OperatorDisableRequestSchema>;

export const OperatorDisableResponseSchema = z.object({
  operatorId: z.number(),
  status: z.string(),
  terminatedSessionCount: z.number(),
  invalidatedApprovalCount: z.number(),
});
export type OperatorDisableResponse = z.infer<typeof OperatorDisableResponseSchema>;

export const OperatorEnableResponseSchema = z.object({
  operatorId: z.number(),
  status: z.string(),
});
export type OperatorEnableResponse = z.infer<typeof OperatorEnableResponseSchema>;

export const OpsEnterpriseLeadDetailResponseSchema = z.object({
  leadId: z.number(),
  companyName: z.string(),
  contactName: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  branchCount: z.number(),
  expectedSeats: z.number(),
  migrationNeeded: z.boolean(),
  content: z.string(),
  status: z.string(),
  assignedOperatorId: z.number().nullable().optional(),
  assignedOperatorName: z.string().nullable().optional(),
  contractReference: z.string().nullable().optional(),
  contractedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  closedReason: z.string().nullable().optional(),
  closedNote: z.string().nullable().optional(),
  closedFromStatus: z.string().nullable().optional(),
  closedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  quotes: z.array(
    z.object({
      quoteId: z.number(),
      versionNo: z.number(),
      officeCount: z.number(),
      seatCount: z.number(),
      quoteAmount: z.number(),
      taxAmount: z.number(),
      serviceScope: z.string(),
      deliveryDueAt: z.iso.date(),
      paymentMethod: z.string(),
      refundTerms: z.string(),
      issuedAt: z.iso.datetime({ offset: true }),
      issuedByOperatorName: z.string(),
      expiresAt: z.iso.datetime({ offset: true }),
      expired: z.boolean(),
      acceptedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      rejectedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      supersededAt: z.iso.datetime({ offset: true }).nullable().optional(),
      billingInvoiceId: z.number().nullable().optional(),
    }),
  ),
  history: z.array(
    z.object({
      eventType: z.string(),
      fromStatus: z.string().nullable().optional(),
      toStatus: z.string(),
      actorType: z.string(),
      actorOperatorName: z.string().nullable().optional(),
      assignedOperatorName: z.string().nullable().optional(),
      quoteId: z.number().nullable().optional(),
      reason: z.string().nullable().optional(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  allowedActions: z.array(z.string()),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsEnterpriseLeadDetailResponse = z.infer<typeof OpsEnterpriseLeadDetailResponseSchema>;

export const OpsEnterpriseLeadAssignRequestSchema = z.object({ assignedOperatorId: z.number() });
export type OpsEnterpriseLeadAssignRequest = z.infer<typeof OpsEnterpriseLeadAssignRequestSchema>;

export const OpsEnterpriseLeadAssignResponseSchema = z.object({
  leadId: z.number(),
  status: z.string(),
  assignedOperatorId: z.number(),
  assignedOperatorName: z.string(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsEnterpriseLeadAssignResponse = z.infer<typeof OpsEnterpriseLeadAssignResponseSchema>;

export const OpsEnterpriseLeadConsultationStartResponseSchema = z.object({
  leadId: z.number(),
  status: z.string(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsEnterpriseLeadConsultationStartResponse = z.infer<
  typeof OpsEnterpriseLeadConsultationStartResponseSchema
>;

export const OpsEnterpriseLeadContractRequestSchema = z.object({
  contractReference: z.string(),
  contractedAt: z.iso.datetime({ offset: true }),
});
export type OpsEnterpriseLeadContractRequest = z.infer<
  typeof OpsEnterpriseLeadContractRequestSchema
>;

export const OpsEnterpriseLeadContractResponseSchema = z.object({
  leadId: z.number(),
  status: z.string(),
  contractReference: z.string(),
  contractedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsEnterpriseLeadContractResponse = z.infer<
  typeof OpsEnterpriseLeadContractResponseSchema
>;

export const OpsEnterpriseLeadCloseRequestSchema = z.object({
  closedReason: z.string(),
  closedNote: z.string().nullable().optional(),
});
export type OpsEnterpriseLeadCloseRequest = z.infer<typeof OpsEnterpriseLeadCloseRequestSchema>;

export const OpsEnterpriseLeadCloseResponseSchema = z.object({
  leadId: z.number(),
  status: z.string(),
  closedReason: z.string(),
  closedFromStatus: z.string(),
  closedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsEnterpriseLeadCloseResponse = z.infer<typeof OpsEnterpriseLeadCloseResponseSchema>;

export const OpsEnterpriseLeadReopenRequestSchema = z.object({
  reason: z.string(),
  assignedOperatorId: z.number().nullable().optional(),
});
export type OpsEnterpriseLeadReopenRequest = z.infer<typeof OpsEnterpriseLeadReopenRequestSchema>;

export const OpsEnterpriseLeadReopenResponseSchema = z.object({
  leadId: z.number(),
  status: z.string(),
  assignedOperatorId: z.number().nullable().optional(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsEnterpriseLeadReopenResponse = z.infer<typeof OpsEnterpriseLeadReopenResponseSchema>;

export const OpsImportSupportRejectRequestSchema = z.object({ reason: z.string() });
export type OpsImportSupportRejectRequest = z.infer<typeof OpsImportSupportRejectRequestSchema>;

export const OpsImportSupportRejectResponseSchema = z.object({
  requestId: z.number(),
  status: z.string(),
  rejectedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsImportSupportRejectResponse = z.infer<typeof OpsImportSupportRejectResponseSchema>;

export const OpsImportSupportRequestDetailResponseSchema = z.object({
  requestId: z.number(),
  officeId: z.number(),
  officeName: z.string().nullable(),
  importBatchId: z.number(),
  batchStatus: z.string(),
  rowCount: z.number().nullable(),
  sourceSystem: z.string(),
  estimatedRowCount: z.number().nullable(),
  quoteAmount: z.number().nullable().optional(),
  scopeNote: z.string().nullable().optional(),
  status: z.string(),
  assignedOperatorId: z.number().nullable().optional(),
  assignedOperatorName: z.string().nullable().optional(),
  processingStartedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  submittedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  changeRequestCount: z.number(),
  changeRequestReason: z.string().nullable().optional(),
  changeRequestedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  approvedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  approvedMappingVersionNo: z.number().nullable().optional(),
  executedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  deliveredAt: z.iso.datetime({ offset: true }).nullable().optional(),
  cancelledAt: z.iso.datetime({ offset: true }).nullable().optional(),
  rejectedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  rejectReason: z.string().nullable().optional(),
  currentMapping: z
    .object({
      versionNo: z.number(),
      sourceSystem: z.string(),
      targetType: z.string(),
      confirmedByType: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
      items: z.array(
        z.object({
          sourceColumn: z.string(),
          targetField: z.string(),
          confidence: z.number().nullable().optional(),
        }),
      ),
    })
    .nullable()
    .optional(),
  sourceColumns: z.array(z.string()),
  mappingHistory: z.array(
    z.object({
      versionNo: z.number(),
      confirmedByType: z.string(),
      confirmedByName: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  previewSummary: z
    .object({
      rowCount: z.number(),
      warningCount: z.number(),
      duplicateCount: z.number(),
      relationMatchCount: z.number(),
    })
    .nullable()
    .optional(),
  allowedActions: z.array(z.string()),
  requestedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsImportSupportRequestDetailResponse = z.infer<
  typeof OpsImportSupportRequestDetailResponseSchema
>;

export const OpsImportSupportStartResponseSchema = z.object({
  requestId: z.number(),
  status: z.string(),
  assignedOperatorId: z.number(),
  processingStartedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsImportSupportStartResponse = z.infer<typeof OpsImportSupportStartResponseSchema>;

export const OpsImportSupportMappingRequestSchema = z.object({
  mappings: z.array(z.object({ sourceColumn: z.string(), targetField: z.string() })),
  sourceSystem: z.string(),
  targetType: z.string().nullable().optional(),
});
export type OpsImportSupportMappingRequest = z.infer<typeof OpsImportSupportMappingRequestSchema>;

export const OpsImportSupportMappingResponseSchema = z.object({
  requestId: z.number(),
  status: z.string(),
  mappingVersionNo: z.number(),
  previewSummary: z
    .object({
      rowCount: z.number(),
      warningCount: z.number(),
      duplicateCount: z.number(),
      relationMatchCount: z.number(),
    })
    .nullable()
    .optional(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsImportSupportMappingResponse = z.infer<typeof OpsImportSupportMappingResponseSchema>;

export const OpsImportSupportSubmitReviewResponseSchema = z.object({
  requestId: z.number(),
  status: z.string(),
  submittedMappingVersionNo: z.number(),
  submittedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsImportSupportSubmitReviewResponse = z.infer<
  typeof OpsImportSupportSubmitReviewResponseSchema
>;

export const OpsImportSupportExecuteResponseSchema = z.object({
  requestId: z.number(),
  importBatchId: z.number(),
  status: z.string(),
  batchStatus: z.string(),
  approvedMappingVersionNo: z.number(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsImportSupportExecuteResponse = z.infer<typeof OpsImportSupportExecuteResponseSchema>;

export const RawAccessListResponseSchema = z.object({
  items: z.array(
    z.object({
      requestId: z.number(),
      requestType: z.string(),
      targetType: z.string(),
      targetId: z.number().nullable().optional(),
      purpose: z.string(),
      scope: z.string(),
      status: z.string(),
      requestedByOperatorId: z.number(),
      requestedByName: z.string(),
      beneficiaryOperatorId: z.number().nullable().optional(),
      approvedByName: z.string().nullable().optional(),
      approvedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
      grantId: z.number().nullable().optional(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type RawAccessListResponse = z.infer<typeof RawAccessListResponseSchema>;

export const RawAccessDetailResponseSchema = z.object({
  requestId: z.number(),
  requestType: z.string(),
  targetType: z.string(),
  targetId: z.number().nullable().optional(),
  purpose: z.string(),
  scope: z.string(),
  status: z.string(),
  requestedByOperatorId: z.number(),
  requestedByName: z.string(),
  beneficiaryOperatorId: z.number().nullable().optional(),
  approvedByName: z.string().nullable().optional(),
  approvedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  grantId: z.number().nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  basisType: z.string(),
  basisNote: z.string(),
  linkedInquiryId: z.number().nullable().optional(),
  officeId: z.number().nullable().optional(),
  rejectedByName: z.string().nullable().optional(),
  rejectedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  rejectReason: z.string().nullable().optional(),
  grant: z
    .object({
      grantId: z.number(),
      executedAt: z.iso.datetime({ offset: true }),
      expiresAt: z.iso.datetime({ offset: true }),
      fileSize: z.number().nullable().optional(),
      fileSha256: z.string().nullable().optional(),
      downloadedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      revokedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      revokedByName: z.string().nullable().optional(),
      revokeReason: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});
export type RawAccessDetailResponse = z.infer<typeof RawAccessDetailResponseSchema>;

export const RawAccessRequestRejectRequestSchema = z.object({ reason: z.string() });
export type RawAccessRequestRejectRequest = z.infer<typeof RawAccessRequestRejectRequestSchema>;

export const RawAccessRejectResponseSchema = z.object({
  requestId: z.number(),
  status: z.string(),
  rejectedAt: z.iso.datetime({ offset: true }),
});
export type RawAccessRejectResponse = z.infer<typeof RawAccessRejectResponseSchema>;

export const RawAccessRevokeRequestSchema = z.object({ reason: z.string() });
export type RawAccessRevokeRequest = z.infer<typeof RawAccessRevokeRequestSchema>;

export const RawAccessRevokeResponseSchema = z.object({
  grantId: z.number(),
  revokedAt: z.iso.datetime({ offset: true }),
  revokedByOperatorId: z.number(),
});
export type RawAccessRevokeResponse = z.infer<typeof RawAccessRevokeResponseSchema>;

export const RawAccessFileResponseSchema = z.object({});
export type RawAccessFileResponse = z.infer<typeof RawAccessFileResponseSchema>;

export const RawAccessContentResponseSchema = z.object({
  grantId: z.number(),
  approvalRequestId: z.number(),
  targetType: z.enum([
    "OFFICE",
    "MEMBER",
    "SUPPORT_INQUIRY",
    "IMPORT_BATCH",
    "OFFICE_REGISTRATION",
  ]),
  targetId: z.number(),
  expiresAt: z.iso.datetime({ offset: true }),
  readAt: z.iso.datetime({ offset: true }),
  content: z.record(z.string(), z.unknown()),
});
export type RawAccessContentResponse = z.infer<typeof RawAccessContentResponseSchema>;

export const OfficeRegistrationReviewChecklistRequestSchema = z.object({
  items: z.array(
    z.object({
      itemCode: z.enum([
        "REVISION_MATCH",
        "SOURCE_VERIFIED",
        "REGISTRATION_RELATION",
        "QUALIFICATION_EDUCATION",
        "EMPLOYMENT_ROSTER",
      ]),
      checked: z.boolean(),
    }),
  ),
});
export type OfficeRegistrationReviewChecklistRequest = z.infer<
  typeof OfficeRegistrationReviewChecklistRequestSchema
>;

export const OfficeRegistrationReviewChecklistResponseSchema = z.object({
  registrationId: z.number(),
  revisionNo: z.number(),
  reviewChecklist: z.array(
    z.object({
      itemCode: z.enum([
        "REVISION_MATCH",
        "SOURCE_VERIFIED",
        "REGISTRATION_RELATION",
        "QUALIFICATION_EDUCATION",
        "EMPLOYMENT_ROSTER",
      ]),
      checked: z.boolean(),
      checkedByOperatorName: z.string().nullable().optional(),
      checkedAt: z.iso.datetime({ offset: true }).nullable().optional(),
    }),
  ),
  canApprove: z.boolean(),
});
export type OfficeRegistrationReviewChecklistResponse = z.infer<
  typeof OfficeRegistrationReviewChecklistResponseSchema
>;

export const OpsSupportInquiryDetailResponseSchema = z.object({
  inquiryId: z.number(),
  officeId: z.number().nullable(),
  officeName: z.string().nullable(),
  authorUserId: z.number(),
  authorDisplayName: z.string(),
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
  assignedOperatorId: z.number().nullable(),
  assignedOperatorName: z.string().nullable(),
  responseDueAt: z.iso.datetime({ offset: true }),
  answeredAt: z.iso.datetime({ offset: true }).nullable(),
  closedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  content: z.string(),
  requestScope: z.string().nullable(),
  messages: z.array(
    z.object({
      messageId: z.number(),
      visibility: z.enum(["PUBLIC", "INTERNAL"]),
      authorType: z.enum(["REQUESTER", "OPERATOR"]),
      authorDisplayName: z.string(),
      content: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  attachments: z.array(
    z.object({
      attachmentId: z.number(),
      messageId: z.number().nullable(),
      visibility: z.enum(["PUBLIC", "INTERNAL"]),
      fileName: z.string(),
      mediaType: z.string(),
      sizeBytes: z.number(),
      scanStatus: z.enum(["PENDING", "CLEAN", "REJECTED"]),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsSupportInquiryDetailResponse = z.infer<typeof OpsSupportInquiryDetailResponseSchema>;

export const SupportInquiryPriorityRequestSchema = z.object({
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  reason: z.string().nullable().optional(),
});
export type SupportInquiryPriorityRequest = z.infer<typeof SupportInquiryPriorityRequestSchema>;

export const OpsSupportInquiryPriorityResponseSchema = z.object({
  inquiryId: z.number(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  responseDueAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsSupportInquiryPriorityResponse = z.infer<
  typeof OpsSupportInquiryPriorityResponseSchema
>;

export const OpsBillingInvoiceDetailResponseSchema = z.object({
  invoiceId: z.number(),
  officeId: z.number(),
  subscriptionId: z.number(),
  billingPeriodStart: z.iso.datetime({ offset: true }),
  billingPeriodEnd: z.iso.datetime({ offset: true }),
  amount: z.number(),
  memberCountSnapshot: z.number(),
  unitPriceSnapshot: z.number(),
  vatIncludedAmount: z.number(),
  priceVersion: z.string(),
  consentVersion: z.string(),
  consentAmountLimit: z.number(),
  consentedAt: z.iso.datetime({ offset: true }),
  purchaseConsentId: z.number(),
  status: z.enum([
    "UNBILLED",
    "PROCESSING",
    "VERIFYING",
    "PAID",
    "FAILED",
    "PARTIALLY_REFUNDED",
    "FULLY_REFUNDED",
    "CANCELLED",
  ]),
  dueAt: z.iso.datetime({ offset: true }),
  paidAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  chargeAttempts: z.array(
    z.object({
      attemptNo: z.number(),
      pgOrderId: z.string(),
      result: z.enum(["PROCESSING", "VERIFYING", "SUCCESS", "FAILED"]),
      attemptedAt: z.iso.datetime({ offset: true }),
      resolvedAt: z.iso.datetime({ offset: true }).nullable(),
      failureReason: z.string().nullable(),
    }),
  ),
  refunds: z.array(
    z.object({
      refundId: z.number(),
      reasonCode: z.enum([
        "CANCELLATION",
        "AUTH_SUSPENSION",
        "DUPLICATE_CHARGE",
        "INCORRECT_CHARGE",
        "SERVICE_FAILURE",
        "LATE_APPROVAL",
        "POLICY_COMPENSATION",
      ]),
      status: z.enum([
        "RECEIVED",
        "REVIEWING",
        "APPROVED",
        "REJECTED",
        "PROCESSING",
        "VERIFYING",
        "COMPLETED",
        "FAILED",
      ]),
      refundAmount: z.number().nullable(),
      requestedAt: z.iso.datetime({ offset: true }),
      resolvedAt: z.iso.datetime({ offset: true }).nullable(),
    }),
  ),
});
export type OpsBillingInvoiceDetailResponse = z.infer<typeof OpsBillingInvoiceDetailResponseSchema>;

export const OpsRefundDetailResponseSchema = z.object({
  refundId: z.number(),
  officeId: z.number(),
  invoiceId: z.number(),
  reasonCode: z.enum([
    "CANCELLATION",
    "AUTH_SUSPENSION",
    "DUPLICATE_CHARGE",
    "INCORRECT_CHARGE",
    "SERVICE_FAILURE",
    "LATE_APPROVAL",
    "POLICY_COMPENSATION",
  ]),
  reasonEventType: z.enum([
    "INVOICE",
    "SUBSCRIPTION_CANCELLATION",
    "AUTH_SUSPENSION",
    "SERVICE_INCIDENT",
    "LATE_APPROVAL",
    "POLICY_COMPENSATION",
  ]),
  reasonEventId: z.string().nullable(),
  requestedAt: z.iso.datetime({ offset: true }),
  status: z.enum([
    "RECEIVED",
    "REVIEWING",
    "APPROVED",
    "REJECTED",
    "PROCESSING",
    "VERIFYING",
    "COMPLETED",
    "FAILED",
  ]),
  entitlementAmount: z.number().nullable(),
  previousRefundAmount: z.number(),
  reservedAmount: z.number(),
  refundAmount: z.number().nullable(),
  reviewedByOperatorId: z.number().nullable(),
  reviewedByOperatorName: z.string().nullable(),
  reviewedAt: z.iso.datetime({ offset: true }).nullable(),
  rejectionReason: z.string().nullable(),
  pgRefundId: z.string().nullable(),
  resolvedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type OpsRefundDetailResponse = z.infer<typeof OpsRefundDetailResponseSchema>;

export const OpsPrivacyRequestDetailResponseSchema = z.object({
  requestId: z.number(),
  officeId: z.number().nullable(),
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
  receivedAt: z.iso.datetime({ offset: true }),
  legalBasis: z.string(),
  requestScope: z.string(),
  legalDueAt: z.iso.datetime({ offset: true }),
  internalDueAt: z.iso.datetime({ offset: true }),
  dueState: z.enum(["ON_TRACK", "APPROACHING", "OVERDUE"]).nullable(),
  decisionReason: z.string().nullable(),
  completionEvidence: z.string().nullable(),
  assignedOperatorId: z.number().nullable(),
  assignedOperatorName: z.string().nullable(),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  events: z.array(
    z.object({
      eventId: z.number(),
      eventType: z.string(),
      previousStatus: z.string().nullable(),
      newStatus: z.string(),
      actionDetail: z.string(),
      actorOperatorName: z.string().nullable(),
      occurredAt: z.iso.datetime({ offset: true }),
    }),
  ),
  version: z.number(),
  handlerType: z.enum(["SAIRO", "OFFICE"]),
});
export type OpsPrivacyRequestDetailResponse = z.infer<typeof OpsPrivacyRequestDetailResponseSchema>;

export const ReturnGrantTransferRequestSchema = z.object({
  newGranteeUserId: z.number(),
  identityEvidenceReference: z.string(),
  registrationRelationReference: z.string(),
  reason: z.string(),
});
export type ReturnGrantTransferRequest = z.infer<typeof ReturnGrantTransferRequestSchema>;

export const OpsReturnGrantTransferResponseSchema = z.object({
  previousGrantId: z.number(),
  revokedAt: z.iso.datetime({ offset: true }),
  newGrantId: z.number(),
  newGranteeUserId: z.number(),
  grantedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type OpsReturnGrantTransferResponse = z.infer<typeof OpsReturnGrantTransferResponseSchema>;

export const ArchiveGrantTransferRequestSchema = z.object({
  newGranteeUserId: z.number(),
  identityEvidenceReference: z.string(),
  registrationRelationReference: z.string(),
  contractReference: z.string(),
  reason: z.string(),
});
export type ArchiveGrantTransferRequest = z.infer<typeof ArchiveGrantTransferRequestSchema>;

export const OpsArchiveGrantTransferResponseSchema = z.object({
  previousGrantId: z.number(),
  terminatedAt: z.iso.datetime({ offset: true }),
  newGrantId: z.number(),
  newGranteeUserId: z.number(),
  grantedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type OpsArchiveGrantTransferResponse = z.infer<typeof OpsArchiveGrantTransferResponseSchema>;

export const DeletionQueueCancelRequestSchema = z.object({ reason: z.string() });
export type DeletionQueueCancelRequest = z.infer<typeof DeletionQueueCancelRequestSchema>;

export const DeletionQueueCancelResponseSchema = z.object({
  queueId: z.number(),
  cancelledAt: z.iso.datetime({ offset: true }),
  cancelledByOperatorId: z.number(),
});
export type DeletionQueueCancelResponse = z.infer<typeof DeletionQueueCancelResponseSchema>;

export const OpsAnnouncementSubmitReviewResponseSchema = z.object({
  announcementId: z.number(),
  versionNo: z.number(),
  status: z.string(),
  reviewedByOperatorId: z.number(),
});
export type OpsAnnouncementSubmitReviewResponse = z.infer<
  typeof OpsAnnouncementSubmitReviewResponseSchema
>;

export const OpsAnnouncementEndResponseSchema = z.object({
  announcementId: z.number(),
  versionNo: z.number(),
  status: z.string(),
  endedAt: z.iso.datetime({ offset: true }),
});
export type OpsAnnouncementEndResponse = z.infer<typeof OpsAnnouncementEndResponseSchema>;

export const OpsAnnouncementRevisionRequestSchema = z.object({
  title: z.string(),
  content: z.string(),
  audienceType: z.string(),
  audienceStatus: z.string().nullable().optional(),
  audienceOfficeId: z.number().nullable().optional(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  importance: z.string(),
  detailUrl: z.string().nullable().optional(),
  marketing: z.boolean(),
});
export type OpsAnnouncementRevisionRequest = z.infer<typeof OpsAnnouncementRevisionRequestSchema>;

export const OpsAnnouncementRevisionResponseSchema = z.object({
  announcementId: z.number(),
  versionNo: z.number(),
  previousVersionId: z.number(),
  status: z.string(),
});
export type OpsAnnouncementRevisionResponse = z.infer<typeof OpsAnnouncementRevisionResponseSchema>;

export const OpsAnnouncementPreviewResponseSchema = z.object({
  announcementId: z.number(),
  targetOfficeCount: z.number(),
  marketingExcludedCount: z.number(),
  renderedContent: z.string(),
});
export type OpsAnnouncementPreviewResponse = z.infer<typeof OpsAnnouncementPreviewResponseSchema>;

export const OpsPolicyDocumentSubmitReviewResponseSchema = z.object({
  documentId: z.number(),
  version: z.string(),
  status: z.string(),
  reviewedByOperatorId: z.number(),
});
export type OpsPolicyDocumentSubmitReviewResponse = z.infer<
  typeof OpsPolicyDocumentSubmitReviewResponseSchema
>;

export const OpsTrialEventPreviewResponseSchema = z.object({
  eventId: z.number(),
  targetOfficeCount: z.number(),
  duplicateBenefitCount: z.number(),
  duplicateOffices: z.array(z.object({ officeId: z.number(), officeName: z.string() })),
});
export type OpsTrialEventPreviewResponse = z.infer<typeof OpsTrialEventPreviewResponseSchema>;

export const OpsTrialEventApproveResponseSchema = z.object({
  eventId: z.number(),
  status: z.enum(["SCHEDULED", "ACTIVE"]),
  approvedByOperatorId: z.number(),
});
export type OpsTrialEventApproveResponse = z.infer<typeof OpsTrialEventApproveResponseSchema>;

export const OpsTrialEventStopResponseSchema = z.object({
  eventId: z.number(),
  status: z.string(),
  endsAt: z.iso.datetime({ offset: true }),
});
export type OpsTrialEventStopResponse = z.infer<typeof OpsTrialEventStopResponseSchema>;

export const OpsPriceScheduleApproveResponseSchema = z.object({
  scheduleId: z.number(),
  version: z.string(),
  status: z.enum(["SCHEDULED", "ACTIVE"]),
  approvedByOperatorId: z.number(),
});
export type OpsPriceScheduleApproveResponse = z.infer<typeof OpsPriceScheduleApproveResponseSchema>;

export const OpsCompanyServiceInfoInquiryTestRequestSchema = z.object({ result: z.string() });
export type OpsCompanyServiceInfoInquiryTestRequest = z.infer<
  typeof OpsCompanyServiceInfoInquiryTestRequestSchema
>;

export const OpsCompanyServiceInfoInquiryTestResponseSchema = z.object({
  infoId: z.number(),
  inquiryDeliveryTestedAt: z.iso.datetime({ offset: true }).nullable(),
  reviewedByOperatorId: z.number().nullable(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type OpsCompanyServiceInfoInquiryTestResponse = z.infer<
  typeof OpsCompanyServiceInfoInquiryTestResponseSchema
>;

export const OpsIntegrationCheckResponseSchema = z.object({
  integrationId: z.number(),
  lastCheckResult: z.enum(["SUCCESS", "FAILED"]),
  lastSuccessAt: z.iso.datetime({ offset: true }).nullable(),
});
export type OpsIntegrationCheckResponse = z.infer<typeof OpsIntegrationCheckResponseSchema>;

export const OpsPrivacyIncidentUpdateRequestSchema = z.object({ responseEvidence: z.string() });
export type OpsPrivacyIncidentUpdateRequest = z.infer<typeof OpsPrivacyIncidentUpdateRequestSchema>;

export const OpsPrivacyIncidentUpdateResponseSchema = z.object({
  privacyIncidentId: z.number(),
  responseEvidence: z.string(),
});
export type OpsPrivacyIncidentUpdateResponse = z.infer<
  typeof OpsPrivacyIncidentUpdateResponseSchema
>;

export const OpsVisitReviewDisputeDecisionRequestSchema = z.object({
  decision: z.enum(["UPHELD", "REMOVED"]),
  decisionNote: z.string(),
});
export type OpsVisitReviewDisputeDecisionRequest = z.infer<
  typeof OpsVisitReviewDisputeDecisionRequestSchema
>;

export const OpsVisitReviewDisputeListResponseSchema = z.object({
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  items: z.array(
    z.object({
      disputeId: z.number(),
      status: z.enum(["OPEN", "UPHELD", "REMOVED"]),
      reasonCode: z.enum(["FACT_INCORRECT", "WRONG_TARGET", "OTHER"]),
      reasonText: z.string(),
      filedAt: z.iso.datetime({ offset: true }),
      dueAt: z.iso.datetime({ offset: true }),
      review: z.object({
        reviewId: z.number(),
        scheduleItemId: z.number(),
        reviewStatus: z.enum(["ACTIVE", "DISPUTED", "REMOVED", "WITHDRAWN"]),
        actualVisitedAt: z.iso.datetime({ offset: true }),
        answers: z.record(z.string(), z.unknown()),
        submittedAt: z.iso.datetime({ offset: true }),
        lastRevisedAt: z.iso.datetime({ offset: true }),
        revisionCount: z.number(),
        approverType: z.enum(["OCCUPANT", "OWNER", "DELEGATE"]),
        issuerIsReviewedBroker: z.boolean(),
      }),
      reviewedBroker: z.object({
        membershipId: z.number(),
        brokerName: z.string(),
        officeId: z.number(),
        officeName: z.string(),
      }),
      decidedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      decisionNote: z.string().nullable().optional(),
    }),
  ),
});
export type OpsVisitReviewDisputeListResponse = z.infer<
  typeof OpsVisitReviewDisputeListResponseSchema
>;

export const OpsVisitReviewRemoveRequestSchema = z.object({
  reasonCode: z.enum(["LEGAL_REQUEST", "PRIVACY_REQUEST", "OPERATOR_DISCRETION"]),
  decisionNote: z.string(),
});
export type OpsVisitReviewRemoveRequest = z.infer<typeof OpsVisitReviewRemoveRequestSchema>;

export const OpsVisitReviewResponseSchema = z.object({
  reviewId: z.number(),
  reviewStatus: z.enum(["ACTIVE", "REMOVED"]),
  disputeId: z.number().nullable().optional(),
  disputeStatus: z.enum(["UPHELD", "REMOVED"]).nullable().optional(),
  removedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  decidedAt: z.iso.datetime({ offset: true }),
});
export type OpsVisitReviewResponse = z.infer<typeof OpsVisitReviewResponseSchema>;

export const OpsPriceChangeNoticeCreateRequestSchema = z.object({
  officeIds: z.array(z.number()).nullable().optional(),
});
export type OpsPriceChangeNoticeCreateRequest = z.infer<
  typeof OpsPriceChangeNoticeCreateRequestSchema
>;

export const OpsPriceChangeNoticeCreateResponseSchema = z.object({
  priceScheduleId: z.number(),
  createdCount: z.number(),
  skippedCount: z.number(),
  skipped: z.array(
    z.object({
      officeId: z.number(),
      reason: z.enum([
        "START_CUSTOMER_PRICE_LOCK",
        "NO_PAYING_SUBSCRIPTION",
        "ALREADY_NOTIFIED",
        "NO_CHANGE",
      ]),
    }),
  ),
});
export type OpsPriceChangeNoticeCreateResponse = z.infer<
  typeof OpsPriceChangeNoticeCreateResponseSchema
>;

export const OpsPriceChangeNoticeListResponseSchema = z.object({
  items: z.array(
    z.object({
      noticeId: z.number(),
      officeId: z.number(),
      officeName: z.string(),
      subscriptionId: z.number(),
      changeKind: z.enum(["INCREASE", "NON_INCREASE"]),
      fromPriceVersion: z.string(),
      toPriceVersion: z.string(),
      notifiedAt: z.iso.datetime({ offset: true }),
      effectiveAt: z.iso.datetime({ offset: true }),
      responseDueAt: z.iso.datetime({ offset: true }),
      decision: z.enum(["PENDING", "AGREED", "DECLINED", "NOT_REQUIRED", "ENDED_NO_CONSENT"]),
      decidedAt: z.iso.datetime({ offset: true }).nullable(),
    }),
  ),
  summary: z.object({
    pending: z.number(),
    agreed: z.number(),
    declined: z.number(),
    notRequired: z.number(),
    endedNoConsent: z.number(),
  }),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsPriceChangeNoticeListResponse = z.infer<
  typeof OpsPriceChangeNoticeListResponseSchema
>;

export const OpsStartCustomerAgreementApproveResponseSchema = z.object({
  agreementId: z.number(),
  status: z.string(),
  approvedAt: z.iso.datetime({ offset: true }),
  approvedByOperatorId: z.number(),
  cohort: z.object({
    trialEventId: z.number(),
    approvedCount: z.number(),
    maxOffices: z.number().nullable(),
  }),
  subscription: z
    .object({
      subscriptionId: z.number(),
      status: z.string(),
      trialEndsAt: z.iso.datetime({ offset: true }).nullable(),
      firstBillingScheduledAt: z.iso.datetime({ offset: true }).nullable(),
      promoted: z.boolean(),
    })
    .nullable(),
  version: z.number(),
});
export type OpsStartCustomerAgreementApproveResponse = z.infer<
  typeof OpsStartCustomerAgreementApproveResponseSchema
>;

export const OpsStartCustomerAgreementCreateRequestSchema = z.object({
  officeId: z.number(),
  trialEventId: z.number(),
  priceScheduleId: z.number(),
  guaranteeMonths: z.number().nullable().optional(),
  contractedOn: z.iso.date(),
  contractReference: z.string(),
  weeklyUseConfirmed: z.boolean(),
  monthlyInterviewConfirmed: z.boolean(),
  casePublicationConsent: z.boolean().optional(),
  agreementTextVersion: z.string(),
});
export type OpsStartCustomerAgreementCreateRequest = z.infer<
  typeof OpsStartCustomerAgreementCreateRequestSchema
>;

export const OpsStartCustomerAgreementCreateResponseSchema = z.object({
  agreementId: z.number(),
  officeId: z.number(),
  status: z.string(),
  trialEventId: z.number(),
  priceScheduleId: z.number(),
  priceVersion: z.string(),
  priceStartsAt: z.iso.datetime({ offset: true }),
  priceEndsAt: z.iso.datetime({ offset: true }),
  contractedOn: z.iso.date(),
  createdAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OpsStartCustomerAgreementCreateResponse = z.infer<
  typeof OpsStartCustomerAgreementCreateResponseSchema
>;

export const OpsStartCustomerAgreementListResponseSchema = z.object({
  items: z.array(
    z.object({
      agreementId: z.number(),
      officeId: z.number(),
      officeName: z.string(),
      status: z.enum(["REGISTERED", "APPROVED", "REVOKED"]),
      trialEventId: z.number(),
      priceScheduleId: z.number(),
      priceVersion: z.string(),
      priceStartsAt: z.iso.datetime({ offset: true }),
      priceEndsAt: z.iso.datetime({ offset: true }),
      contractedOn: z.iso.date(),
      contractReference: z.string(),
      createdByOperatorId: z.number(),
      approvedByOperatorId: z.number().nullable(),
      approvedAt: z.iso.datetime({ offset: true }).nullable(),
      ownerAcknowledgedAt: z.iso.datetime({ offset: true }).nullable(),
      version: z.number(),
    }),
  ),
  cohorts: z.array(
    z.object({
      trialEventId: z.number(),
      eventName: z.string(),
      approvedCount: z.number(),
      maxOffices: z.number().nullable(),
      targetCount: z.number(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OpsStartCustomerAgreementListResponse = z.infer<
  typeof OpsStartCustomerAgreementListResponseSchema
>;

export const OpsStartCustomerAgreementRevokeRequestSchema = z.object({ reason: z.string() });
export type OpsStartCustomerAgreementRevokeRequest = z.infer<
  typeof OpsStartCustomerAgreementRevokeRequestSchema
>;

export const OpsStartCustomerAgreementRevokeResponseSchema = z.object({
  agreementId: z.number(),
  status: z.string(),
  revokedAt: z.iso.datetime({ offset: true }),
  revokedByOperatorId: z.number(),
  freeEndsAtKept: z.boolean(),
  priceChangeNoticeId: z.number().nullable(),
  version: z.number(),
});
export type OpsStartCustomerAgreementRevokeResponse = z.infer<
  typeof OpsStartCustomerAgreementRevokeResponseSchema
>;

export const AuthorityRequestCloseRequestSchema = z.object({
  decision: z.string(),
  providedItems: z.string().nullable().optional(),
  providedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  officeNoticeStatus: z.string(),
  closeNote: z.string().nullable().optional(),
});
export type AuthorityRequestCloseRequest = z.infer<typeof AuthorityRequestCloseRequestSchema>;

export const AuthorityRequestCreateRequestSchema = z.object({
  receivedAt: z.iso.datetime({ offset: true }),
  agencyType: z.string(),
  agencyName: z.string(),
  documentReference: z.string().nullable().optional(),
  legalBasisNote: z.string(),
  targetOfficeId: z.number().nullable().optional(),
  targetUserId: z.number().nullable().optional(),
  requestedItems: z.string(),
});
export type AuthorityRequestCreateRequest = z.infer<typeof AuthorityRequestCreateRequestSchema>;

export const AuthorityRequestListResponseSchema = z.object({
  items: z.array(
    z.object({
      requestId: z.number(),
      receivedAt: z.iso.datetime({ offset: true }),
      agencyType: z.string(),
      agencyName: z.string(),
      documentReference: z.string().nullable(),
      decision: z.string(),
      officeNoticeStatus: z.string(),
      closedAt: z.iso.datetime({ offset: true }).nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type AuthorityRequestListResponse = z.infer<typeof AuthorityRequestListResponseSchema>;

export const AuthorityRequestResponseSchema = z.object({
  requestId: z.number(),
  receivedAt: z.iso.datetime({ offset: true }),
  agencyType: z.string(),
  agencyName: z.string(),
  documentReference: z.string().nullable(),
  legalBasisNote: z.string(),
  targetOfficeId: z.number().nullable(),
  targetUserId: z.number().nullable(),
  requestedItems: z.string(),
  decision: z.string(),
  providedItems: z.string().nullable(),
  providedAt: z.iso.datetime({ offset: true }).nullable(),
  officeNoticeStatus: z.string(),
  recordedByOperatorId: z.number(),
  approvedByOperatorId: z.number().nullable(),
  closedAt: z.iso.datetime({ offset: true }).nullable(),
  retentionUntil: z.iso.date().nullable(),
  closeNote: z.string().nullable(),
});
export type AuthorityRequestResponse = z.infer<typeof AuthorityRequestResponseSchema>;

export const GuestPrivacyIntakeListResponseSchema = z.object({
  items: z.array(
    z.object({
      intakeId: z.number(),
      officeId: z.number(),
      officeName: z.string(),
      linkKind: z.string(),
      requestType: z.string(),
      requesterRole: z.string(),
      contactChannel: z.string(),
      maskedContact: z.string().nullable(),
      verificationStatus: z.string(),
      status: z.string(),
      receivedAt: z.iso.datetime({ offset: true }),
      internalDueAt: z.iso.datetime({ offset: true }),
      privacyRequestId: z.number().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type GuestPrivacyIntakeListResponse = z.infer<typeof GuestPrivacyIntakeListResponseSchema>;

export const GuestPrivacyIntakeDetailResponseSchema = z.object({
  intakeId: z.number(),
  officeId: z.number(),
  officeName: z.string(),
  linkKind: z.string(),
  requestType: z.string(),
  requesterRole: z.string(),
  contactChannel: z.string(),
  maskedContact: z.string().nullable(),
  verificationStatus: z.string(),
  status: z.string(),
  receivedAt: z.iso.datetime({ offset: true }),
  internalDueAt: z.iso.datetime({ offset: true }),
  privacyRequestId: z.number().nullable(),
  closedReason: z.string().nullable(),
});
export type GuestPrivacyIntakeDetailResponse = z.infer<
  typeof GuestPrivacyIntakeDetailResponseSchema
>;

export const GuestPrivacyIntakeResolveRequestSchema = z.object({
  verificationResult: z.string(),
  action: z.string(),
  legalBasis: z.string().nullable().optional(),
  requestScope: z.string().nullable().optional(),
  legalDueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  internalDueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  closeReason: z.string().nullable().optional(),
});
export type GuestPrivacyIntakeResolveRequest = z.infer<
  typeof GuestPrivacyIntakeResolveRequestSchema
>;

export const GuestPrivacyIntakeResolveResponseSchema = z.object({
  intakeId: z.number(),
  status: z.string(),
  verificationStatus: z.string(),
  privacyRequestId: z.number().nullable(),
  closedReason: z.string().nullable(),
});
export type GuestPrivacyIntakeResolveResponse = z.infer<
  typeof GuestPrivacyIntakeResolveResponseSchema
>;

export const KakaoUnlinkEventListResponseSchema = z.object({
  items: z.array(
    z.object({
      eventId: z.number(),
      direction: z.string(),
      status: z.string(),
      attemptCount: z.number(),
      nextAttemptAt: z.iso.datetime({ offset: true }).nullable(),
      lastErrorCode: z.string().nullable(),
      referrerType: z.string().nullable(),
      userId: z.number().nullable(),
      occurredAt: z.iso.datetime({ offset: true }),
      completedAt: z.iso.datetime({ offset: true }).nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type KakaoUnlinkEventListResponse = z.infer<typeof KakaoUnlinkEventListResponseSchema>;

export const KakaoUnlinkEventRetryResponseSchema = z.object({
  eventId: z.number(),
  status: z.string(),
  attemptCount: z.number(),
  nextAttemptAt: z.iso.datetime({ offset: true }),
});
export type KakaoUnlinkEventRetryResponse = z.infer<typeof KakaoUnlinkEventRetryResponseSchema>;

export const ProviderContractCopyCreateRequestSchema = z.object({
  documentKind: z.string(),
  versionLabel: z.string(),
  signedOn: z.iso.date().nullable().optional(),
  validUntil: z.iso.date().nullable().optional(),
  storageKey: z.string(),
  contentSha256: z.string(),
  subprocessorChangeNotifiedAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type ProviderContractCopyCreateRequest = z.infer<
  typeof ProviderContractCopyCreateRequestSchema
>;

export const ProviderContractCopyListResponseSchema = z.object({
  items: z.array(
    z.object({
      copyId: z.number(),
      documentKind: z.string(),
      versionLabel: z.string(),
      signedOn: z.iso.date().nullable(),
      validUntil: z.iso.date().nullable(),
      contentSha256: z.string(),
      subprocessorChangeNotifiedAt: z.iso.datetime({ offset: true }).nullable(),
      uploadedAt: z.iso.datetime({ offset: true }),
    }),
  ),
});
export type ProviderContractCopyListResponse = z.infer<
  typeof ProviderContractCopyListResponseSchema
>;

export const ProviderContractCopyResponseSchema = z.object({
  copyId: z.number(),
  integrationId: z.number(),
  documentKind: z.string(),
  versionLabel: z.string(),
  signedOn: z.iso.date().nullable(),
  validUntil: z.iso.date().nullable(),
  contentSha256: z.string(),
  subprocessorChangeNotifiedAt: z.iso.datetime({ offset: true }).nullable(),
  uploadedByOperatorId: z.number(),
  uploadedAt: z.iso.datetime({ offset: true }),
  retentionUntil: z.iso.date().nullable(),
});
export type ProviderContractCopyResponse = z.infer<typeof ProviderContractCopyResponseSchema>;

export const RetentionRuleListResponseSchema = z.object({
  items: z.array(
    z.object({
      ruleCode: z.string(),
      dataGroupLabel: z.string(),
      retentionDays: z.number(),
      anchorEvent: z.string(),
      basisNote: z.string(),
      status: z.string(),
      effectiveFrom: z.iso.date(),
      version: z.number(),
    }),
  ),
});
export type RetentionRuleListResponse = z.infer<typeof RetentionRuleListResponseSchema>;

export const RetentionRuleResponseSchema = z.object({
  ruleCode: z.string(),
  dataGroupLabel: z.string(),
  retentionDays: z.number(),
  anchorEvent: z.string(),
  basisNote: z.string(),
  status: z.string(),
  effectiveFrom: z.iso.date(),
  version: z.number(),
});
export type RetentionRuleResponse = z.infer<typeof RetentionRuleResponseSchema>;

export const RetentionRuleUpdateRequestSchema = z.object({
  retentionDays: z.number(),
  basisNote: z.string(),
  status: z.string(),
  changeReason: z.string(),
});
export type RetentionRuleUpdateRequest = z.infer<typeof RetentionRuleUpdateRequestSchema>;

export const TaxDocumentAmendRequestSchema = z.object({
  approvalNumber: z.string(),
  issuedOn: z.iso.date(),
  supplyAmount: z.number(),
  vatAmount: z.number(),
  operatorNote: z.string(),
});
export type TaxDocumentAmendRequest = z.infer<typeof TaxDocumentAmendRequestSchema>;

export const TaxDocumentListResponseSchema = z.object({
  items: z.array(
    z.object({
      documentId: z.number(),
      invoiceId: z.number(),
      officeId: z.number(),
      officeName: z.string(),
      documentKind: z.string(),
      isElectronic: z.boolean(),
      status: z.string(),
      approvalNumber: z.string().nullable(),
      issuedOn: z.iso.date().nullable(),
      supplyAmount: z.number().nullable(),
      vatAmount: z.number().nullable(),
      dueHint: z.iso.date().nullable(),
      recipientRegistered: z.boolean(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type TaxDocumentListResponse = z.infer<typeof TaxDocumentListResponseSchema>;

export const TaxDocumentRecordRequestSchema = z.object({
  documentKind: z.string(),
  isElectronic: z.boolean(),
  status: z.string(),
  approvalNumber: z.string().nullable().optional(),
  issuedOn: z.iso.date().nullable().optional(),
  supplyAmount: z.number().nullable().optional(),
  vatAmount: z.number().nullable().optional(),
  operatorNote: z.string().nullable().optional(),
});
export type TaxDocumentRecordRequest = z.infer<typeof TaxDocumentRecordRequestSchema>;

export const TaxDocumentResponseSchema = z.object({
  documentId: z.number(),
  invoiceId: z.number(),
  documentKind: z.string(),
  isElectronic: z.boolean(),
  status: z.string(),
  approvalNumber: z.string().nullable(),
  issuedOn: z.iso.date().nullable(),
  supplyAmount: z.number().nullable(),
  vatAmount: z.number().nullable(),
  originalDocumentId: z.number().nullable(),
  operatorNote: z.string().nullable(),
  recordedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type TaxDocumentResponse = z.infer<typeof TaxDocumentResponseSchema>;

export const TermsHashCheckListResponseSchema = z.object({
  items: z.array(
    z.object({
      termsCode: z.string(),
      version: z.string(),
      status: z.string(),
      effectiveAt: z.iso.datetime({ offset: true }),
      lastCheckedAt: z.iso.datetime({ offset: true }).nullable(),
      lastResult: z.string().nullable(),
    }),
  ),
});
export type TermsHashCheckListResponse = z.infer<typeof TermsHashCheckListResponseSchema>;

export const TermsHashCheckRunResponseSchema = z.object({
  checkedAt: z.iso.datetime({ offset: true }),
  mismatchCount: z.number(),
  errorCount: z.number(),
  items: z.array(
    z.object({
      termsCode: z.string(),
      version: z.string(),
      result: z.string(),
      expectedHashPrefix: z.string(),
      actualHashPrefix: z.string().nullable(),
    }),
  ),
});
export type TermsHashCheckRunResponse = z.infer<typeof TermsHashCheckRunResponseSchema>;
