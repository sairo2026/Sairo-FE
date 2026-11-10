// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const AccessApprovalHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      approvalId: z.number(),
      propertyId: z.number(),
      approverType: z.enum(["OCCUPANT", "OWNER", "DELEGATE"]),
      approverName: z.string().nullable(),
      approverPhone: z.string().nullable().optional(),
      validFrom: z.string(),
      validUntil: z.string(),
      source: z.enum(["DIRECT", "PROXY"]),
      recordedByMembershipId: z.number().nullable(),
      recordedAt: z.string(),
      confirmedAt: z.string().nullable().optional(),
      recordedByName: z.string().nullable().optional(),
      timeSlots: z.array(
        z.object({
          slotId: z.number(),
          approvalId: z.number(),
          startsAt: z.string(),
          endsAt: z.string(),
        }),
      ),
      approvalRole: z.enum(["PRIMARY", "CO_APPROVER"]),
      revokedAt: z.iso.datetime({ offset: true }).nullable(),
      revocationReason: z.string().nullable(),
      revocationRecordedAt: z.iso.datetime({ offset: true }).nullable(),
      revokedByUserId: z.number().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type AccessApprovalHistoryResponse = z.infer<typeof AccessApprovalHistoryResponseSchema>;

export const PropertyAccessApprovalCreateRequestSchema = z.object({
  approverType: z.enum(["OCCUPANT", "OWNER", "DELEGATE"]),
  approverName: z.string(),
  approverPhone: z.string().nullable().optional(),
  validFrom: z.iso.datetime({ offset: true }),
  validUntil: z.iso.datetime({ offset: true }),
  timeSlots: z
    .array(
      z.object({
        startsAt: z.iso.datetime({ offset: true }).nullable().optional(),
        endsAt: z.iso.datetime({ offset: true }).nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  source: z.enum(["DIRECT", "PROXY"]),
  approvalRole: z.enum(["PRIMARY", "CO_APPROVER"]).optional(),
  confirmedAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type PropertyAccessApprovalCreateRequest = z.infer<
  typeof PropertyAccessApprovalCreateRequestSchema
>;

export const AccessApprovalResponseSchema = z.object({
  approvalId: z.number(),
  propertyId: z.number(),
  approverType: z.enum(["OCCUPANT", "OWNER", "DELEGATE"]),
  approverName: z.string().nullable(),
  approverPhone: z.string().nullable().optional(),
  validFrom: z.iso.datetime({ offset: true }),
  validUntil: z.iso.datetime({ offset: true }),
  timeSlots: z
    .array(
      z.object({
        startsAt: z.iso.datetime({ offset: true }).nullable().optional(),
        endsAt: z.iso.datetime({ offset: true }).nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  source: z.enum(["DIRECT", "PROXY"]),
  approvalRole: z.enum(["PRIMARY", "CO_APPROVER"]),
  recordedByMembershipId: z.number().nullable().optional(),
  recordedByName: z.string().nullable().optional(),
  confirmedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  version: z.number(),
  revokedAt: z.iso.datetime({ offset: true }).nullable(),
  revocationReason: z.string().nullable(),
  revocationRecordedAt: z.iso.datetime({ offset: true }).nullable(),
  revokedByUserId: z.number().nullable(),
});
export type AccessApprovalResponse = z.infer<typeof AccessApprovalResponseSchema>;

export const AssistantNoticeConfirmResponseSchema = z.object({
  noticeId: z.number(),
  scheduleItemId: z.number(),
  recipientType: z.string(),
  noticeMethod: z.string(),
  notifiedAt: z.string().nullable().optional(),
  recordedAfterTheFact: z.boolean(),
  recipientName: z.string(),
  missingExceptionReason: z.string().nullable().optional(),
  followupAction: z.string().nullable().optional(),
  recordedAt: z.iso.datetime({ offset: true }),
  recordedByMembershipId: z.number(),
  confirmedByMembershipId: z.number().nullable().optional(),
  confirmedAt: z.string().nullable().optional(),
  supervisorAdditionalNotice: z.string().nullable().optional(),
  supervisorAdditionalNoticedAt: z.string().nullable().optional(),
});
export type AssistantNoticeConfirmResponse = z.infer<typeof AssistantNoticeConfirmResponseSchema>;

export const VisitCoordinationListResponseSchema = z.object({
  items: z.array(
    z.object({
      coordinationId: z.number(),
      customerName: z.string(),
      candidatePropertyCount: z.number(),
      managerName: z.string(),
      periodStartDate: z.iso.date(),
      periodEndDate: z.iso.date(),
      candidateProperties: z.array(
        z.object({ candidatePropertyId: z.number(), propertyName: z.string() }),
      ),
      status: z.string(),
      managerMembershipId: z.number(),
      createdAt: z.iso.datetime({ offset: true }),
      officeId: z.number(),
      updatedAt: z.iso.datetime({ offset: true }),
      version: z.number(),
    }),
  ),
  statusCounts: z.object({
    TIME_COLLECTING: z.number(),
    COORDINATABLE: z.number(),
    FINAL_CONFIRMATION_REQUIRED: z.number(),
    APPLYING: z.number(),
    CONFIRMED: z.number(),
    RESCHEDULE_REQUIRED: z.number(),
    VISIT_COMPLETED: z.number(),
    VISIT_INCOMPLETE: z.number(),
    CANCELLED: z.number(),
  }),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type VisitCoordinationListResponse = z.infer<typeof VisitCoordinationListResponseSchema>;

export const VisitCoordinationCreateRequestSchema = z.object({
  customerId: z.number(),
  candidatePropertyIds: z.array(z.number()),
  managerMembershipId: z.number().nullable().optional(),
  periodStartDate: z.iso.date(),
  periodEndDate: z.iso.date(),
});
export type VisitCoordinationCreateRequest = z.infer<typeof VisitCoordinationCreateRequestSchema>;

export const VisitCoordinationCreateResponseSchema = z.object({
  coordinationId: z.number(),
  status: z.string(),
  candidateProperties: z.array(
    z.object({ candidatePropertyId: z.number(), propertyId: z.number(), sortOrder: z.number() }),
  ),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type VisitCoordinationCreateResponse = z.infer<typeof VisitCoordinationCreateResponseSchema>;

export const VisitCoordinationDetailResponseSchema = z.object({
  candidateProperties: z.array(
    z.object({
      candidatePropertyId: z.number(),
      propertyId: z.number(),
      sortOrder: z.number(),
      propertyName: z.string(),
      propertyAddress: z.string().nullable().optional(),
      approverRespondedAt: z.iso.datetime({ offset: true }).nullable(),
      approverTimeSlots: z.array(
        z.object({
          startsAt: z.iso.datetime({ offset: true }),
          endsAt: z.iso.datetime({ offset: true }),
        }),
      ),
      applicableSlots: z.array(
        z.object({
          startsAt: z.iso.datetime({ offset: true }),
          endsAt: z.iso.datetime({ offset: true }),
        }),
      ),
      ownerOfficeId: z.number(),
      ownerOfficeName: z.string(),
      crossOffice: z.boolean(),
      grantId: z.number().nullable().optional(),
      grantState: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]).nullable().optional(),
      propertyAddressDetail: z.string().nullable().optional(),
    }),
  ),
  customerRespondedAt: z.iso.datetime({ offset: true }).nullable(),
  customerTimeSlots: z.array(
    z.object({
      startsAt: z.iso.datetime({ offset: true }),
      endsAt: z.iso.datetime({ offset: true }),
    }),
  ),
  managerName: z.string(),
  confirmedScheduleVersion: z.number().nullable(),
  customerLink: z
    .object({
      linkId: z.number(),
      issuedAt: z.iso.datetime({ offset: true }),
      expiresAt: z.iso.datetime({ offset: true }),
      revokedAt: z.iso.datetime({ offset: true }).nullable(),
      responseVersion: z.number(),
    })
    .nullable(),
  rescheduleAlert: z
    .object({
      triggerType: z.enum(["SCHEDULE_CHANGED", "ACCESS_REVOKED", "OCCUPANT_CHANGED"]),
      reason: z.string().nullable(),
      raisedAt: z.iso.datetime({ offset: true }),
      approvalId: z.number().nullable(),
    })
    .nullable(),
  scheduleItems: z
    .array(
      z.object({
        resultRecordedAt: z.iso.datetime({ offset: true }).nullable(),
        correctionCount: z.number(),
        state: z.enum(["VALID", "RESCHEDULE_REQUIRED"]),
        travelFeasibleToNext: z.boolean().nullable().optional(),
        candidatePropertyId: z.number(),
        itemId: z.number(),
        result: z.enum(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
        scheduledEndAt: z.iso.datetime({ offset: true }).nullable(),
        scheduledStartAt: z.iso.datetime({ offset: true }).nullable(),
      }),
    )
    .nullable()
    .optional(),
  alternatives: z.array(
    z.object({
      scheduleItemId: z.number(),
      candidatePropertyId: z.number(),
      startAt: z.iso.datetime({ offset: true }),
      endAt: z.iso.datetime({ offset: true }),
      checks: z.object({
        customer: z.string(),
        broker: z.string(),
        approverCondition: z.string(),
        confirmedVisits: z.string(),
        travel: z.string(),
      }),
    }),
  ),
  coordinationId: z.number(),
  status: z.string(),
  customerId: z.number(),
  customerName: z.string(),
  managerMembershipId: z.number(),
  periodStartDate: z.iso.date(),
  periodEndDate: z.iso.date(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
  officeId: z.number(),
});
export type VisitCoordinationDetailResponse = z.infer<typeof VisitCoordinationDetailResponseSchema>;

export const ApproverLinkIssueRequestSchema = z.object({ approvalId: z.number() });
export type ApproverLinkIssueRequest = z.infer<typeof ApproverLinkIssueRequestSchema>;

export const ApproverLinkIssueResponseSchema = z.object({
  linkId: z.number(),
  approvalId: z.number(),
  token: z.string(),
  publicUrl: z.string(),
  issuedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type ApproverLinkIssueResponse = z.infer<typeof ApproverLinkIssueResponseSchema>;

export const ApproverLinkReissueResponseSchema = z.object({
  linkId: z.number(),
  approvalId: z.number(),
  token: z.string(),
  publicUrl: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string(),
});
export type ApproverLinkReissueResponse = z.infer<typeof ApproverLinkReissueResponseSchema>;

export const VisitCoordinationCancelRequestSchema = z.object({
  reason: z.string().nullable().optional(),
});
export type VisitCoordinationCancelRequest = z.infer<typeof VisitCoordinationCancelRequestSchema>;

export const VisitCoordinationCancelResponseSchema = z.object({
  coordinationId: z.number(),
  status: z.enum([
    "TIME_COLLECTING",
    "COORDINATABLE",
    "FINAL_CONFIRMATION_REQUIRED",
    "APPLYING",
    "CONFIRMED",
    "RESCHEDULE_REQUIRED",
    "VISIT_COMPLETED",
    "VISIT_INCOMPLETE",
    "CANCELLED",
  ]),
  customerId: z.number(),
  customerName: z.string(),
  managerMembershipId: z.number(),
  periodStartDate: z.iso.date(),
  periodEndDate: z.iso.date(),
  candidateProperties: z.array(
    z.object({ candidatePropertyId: z.number(), propertyId: z.number(), sortOrder: z.number() }),
  ),
  scheduleItems: z.array(
    z.object({
      itemId: z.number(),
      candidatePropertyId: z.number(),
      scheduledStartAt: z.iso.datetime({ offset: true }).nullable(),
      scheduledEndAt: z.iso.datetime({ offset: true }).nullable(),
      result: z.enum(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
    }),
  ),
  affectedItems: z.array(
    z.object({
      scheduleItemId: z.number(),
      candidatePropertyId: z.number(),
      state: z.string(),
      reason: z.string(),
    }),
  ),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
  officeId: z.number(),
});
export type VisitCoordinationCancelResponse = z.infer<typeof VisitCoordinationCancelResponseSchema>;

export const CandidatePropertyAddRequestSchema = z.object({
  propertyId: z.number(),
  sortOrder: z.number().nullable().optional(),
});
export type CandidatePropertyAddRequest = z.infer<typeof CandidatePropertyAddRequestSchema>;

export const CandidatePropertyAddResponseSchema = z.object({
  candidatePropertyId: z.number(),
  coordinationId: z.number(),
  propertyId: z.number(),
  sortOrder: z.number(),
  officeId: z.number(),
  version: z.number(),
});
export type CandidatePropertyAddResponse = z.infer<typeof CandidatePropertyAddResponseSchema>;

export const CandidatePropertyRemoveResponseSchema = z.object({});
export type CandidatePropertyRemoveResponse = z.infer<typeof CandidatePropertyRemoveResponseSchema>;

export const VisitCoordinationConfirmRequestSchema = z.object({
  scheduleItems: z.array(
    z.object({
      candidatePropertyId: z.number(),
      scheduledStartAt: z.iso.datetime({ offset: true }),
      scheduledEndAt: z.iso.datetime({ offset: true }),
      sortOrder: z.number(),
    }),
  ),
});
export type VisitCoordinationConfirmRequest = z.infer<typeof VisitCoordinationConfirmRequestSchema>;

export const VisitCoordinationConfirmResponseSchema = z.object({
  coordinationId: z.number(),
  status: z.string(),
  scheduleItems: z.array(
    z.object({
      itemId: z.number(),
      candidatePropertyId: z.number(),
      scheduledStartAt: z.iso.datetime({ offset: true }),
      scheduledEndAt: z.iso.datetime({ offset: true }),
      result: z.string(),
    }),
  ),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type VisitCoordinationConfirmResponse = z.infer<
  typeof VisitCoordinationConfirmResponseSchema
>;

export const ConfirmationDeliveryCreateRequestSchema = z.object({
  recipientType: z.enum(["CUSTOMER", "APPROVER"]),
  scheduleVersion: z.number(),
  delivered: z.boolean(),
  channel: z.enum(["KAKAO", "SMS", "PHONE", "IN_PERSON", "EMAIL"]).nullable().optional(),
  deliveredAt: z.iso.datetime({ offset: true }).nullable().optional(),
  candidatePropertyId: z.number().nullable().optional(),
});
export type ConfirmationDeliveryCreateRequest = z.infer<
  typeof ConfirmationDeliveryCreateRequestSchema
>;

export const ConfirmationDeliveryResponseSchema = z.object({
  deliveryId: z.number(),
  scheduleVersion: z.number(),
  coordinationId: z.number(),
  recipientType: z.enum(["CUSTOMER", "APPROVER"]),
  candidatePropertyId: z.number().nullable().optional(),
  delivered: z.boolean(),
  channel: z.string().nullable().optional(),
  deliveredAt: z.iso.datetime({ offset: true }).nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  officeId: z.number(),
  version: z.number(),
});
export type ConfirmationDeliveryResponse = z.infer<typeof ConfirmationDeliveryResponseSchema>;

export const CustomerLinkIssueResponseSchema = z.object({
  linkId: z.number(),
  token: z.string(),
  publicUrl: z.string(),
  issuedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type CustomerLinkIssueResponse = z.infer<typeof CustomerLinkIssueResponseSchema>;

export const CustomerLinkReissueResponseSchema = z.object({
  linkId: z.number(),
  token: z.string(),
  publicUrl: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string(),
});
export type CustomerLinkReissueResponse = z.infer<typeof CustomerLinkReissueResponseSchema>;

export const VisitCoordinationRescheduleRequestSchema = z.object({
  reason: z.string().nullable().optional(),
});
export type VisitCoordinationRescheduleRequest = z.infer<
  typeof VisitCoordinationRescheduleRequestSchema
>;

export const VisitCoordinationRescheduleResponseSchema = z.object({
  coordinationId: z.number(),
  status: z.enum([
    "TIME_COLLECTING",
    "COORDINATABLE",
    "FINAL_CONFIRMATION_REQUIRED",
    "APPLYING",
    "CONFIRMED",
    "RESCHEDULE_REQUIRED",
    "VISIT_COMPLETED",
    "VISIT_INCOMPLETE",
    "CANCELLED",
  ]),
  customerId: z.number(),
  customerName: z.string(),
  managerMembershipId: z.number(),
  periodStartDate: z.iso.date(),
  periodEndDate: z.iso.date(),
  candidateProperties: z.array(
    z.object({ candidatePropertyId: z.number(), propertyId: z.number(), sortOrder: z.number() }),
  ),
  scheduleItems: z.array(
    z.object({
      itemId: z.number(),
      candidatePropertyId: z.number(),
      scheduledStartAt: z.iso.datetime({ offset: true }).nullable(),
      scheduledEndAt: z.iso.datetime({ offset: true }).nullable(),
      result: z.enum(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
      state: z.enum(["VALID", "RESCHEDULE_REQUIRED"]),
    }),
  ),
  fixedScheduleItemIds: z.array(z.number()),
  affectedItems: z.array(
    z.object({
      scheduleItemId: z.number(),
      candidatePropertyId: z.number(),
      state: z.string(),
      reason: z.string(),
    }),
  ),
  alternatives: z.array(
    z.object({
      scheduleItemId: z.number(),
      candidatePropertyId: z.number(),
      startAt: z.iso.datetime({ offset: true }),
      endAt: z.iso.datetime({ offset: true }),
      checks: z.object({
        customer: z.string(),
        broker: z.string(),
        approverCondition: z.string(),
        confirmedVisits: z.string(),
        travel: z.string(),
      }),
    }),
  ),
  noAlternativeScheduleItemIds: z.array(z.number()),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
  officeId: z.number(),
});
export type VisitCoordinationRescheduleResponse = z.infer<
  typeof VisitCoordinationRescheduleResponseSchema
>;

export const VisitScheduleUpdateRequestSchema = z.object({
  items: z.array(
    z.object({
      candidatePropertyId: z.number(),
      sortOrder: z.number(),
      visitDurationMinutes: z.number().optional(),
      travelDurationMinutes: z.number().optional(),
    }),
  ),
});
export type VisitScheduleUpdateRequest = z.infer<typeof VisitScheduleUpdateRequestSchema>;

export const VisitScheduleUpdateResponseSchema = z.object({
  coordinationId: z.number(),
  status: z.string(),
  items: z.array(
    z.object({
      candidatePropertyId: z.number(),
      sortOrder: z.number(),
      suggestedStartAt: z.iso.datetime({ offset: true }),
      suggestedEndAt: z.iso.datetime({ offset: true }),
    }),
  ),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type VisitScheduleUpdateResponse = z.infer<typeof VisitScheduleUpdateResponseSchema>;

export const ScheduleConflictCheckResponseSchema = z.object({
  conflicts: z.array(
    z.object({
      candidatePropertyId: z.number(),
      conflictType: z.enum(["MANAGER_OVERLAP", "CUSTOMER_OVERLAP", "PROPERTY_OVERLAP"]),
      conflictingScheduleItemId: z.number(),
      conflictingCoordinationId: z.number().nullable(),
      conflictingStartAt: z.iso.datetime({ offset: true }),
      conflictingEndAt: z.iso.datetime({ offset: true }),
      conflictingPropertyName: z.string().nullable(),
    }),
  ),
});
export type ScheduleConflictCheckResponse = z.infer<typeof ScheduleConflictCheckResponseSchema>;

export const AssistantNoticeCreateRequestSchema = z.object({
  recipientType: z.enum(["CUSTOMER", "APPROVER", "OTHER"]),
  recipientName: z.string(),
  noticeMethod: z.enum(["KAKAO", "SMS", "PHONE", "IN_PERSON", "EMAIL"]),
  notifiedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  missingExceptionReason: z.string().nullable().optional(),
  followupAction: z.string().nullable().optional(),
});
export type AssistantNoticeCreateRequest = z.infer<typeof AssistantNoticeCreateRequestSchema>;

export const AssistantNoticeResponseSchema = z.object({
  noticeId: z.number(),
  scheduleItemId: z.number(),
  recipientType: z.enum(["CUSTOMER", "APPROVER", "OTHER"]),
  noticeMethod: z.string(),
  notifiedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  recordedAfterTheFact: z.boolean(),
  recipientName: z.string(),
  missingExceptionReason: z.string().nullable().optional(),
  followupAction: z.string().nullable().optional(),
  recordedAt: z.iso.datetime({ offset: true }),
  recordedByMembershipId: z.number(),
  confirmedByMembershipId: z.number().nullable().optional(),
  confirmedAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type AssistantNoticeResponse = z.infer<typeof AssistantNoticeResponseSchema>;

export const VisitScheduleItemResultRequestSchema = z.object({
  result: z.enum(["COMPLETED", "NO_SHOW", "CANCELLED"]),
  actualVisitedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  correctionReason: z.string().nullable().optional(),
  cancelReasonCode: z
    .enum(["USER_CANCEL", "APPROVER_REASON", "CUSTOMER_REASON", "OTHER"])
    .nullable()
    .optional(),
});
export type VisitScheduleItemResultRequest = z.infer<typeof VisitScheduleItemResultRequestSchema>;

export const VisitScheduleItemResultResponseSchema = z.object({
  itemId: z.number(),
  coordinationId: z.number(),
  result: z.enum(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
  actualVisitedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  resultRecordedAt: z.iso.datetime({ offset: true }).nullable(),
  reviewWindowEndsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  correctionCount: z.number(),
  coordinationStatus: z.string(),
  affectedItems: z.array(
    z.object({
      scheduleItemId: z.number(),
      candidatePropertyId: z.number(),
      state: z.string(),
      reason: z.string(),
    }),
  ),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type VisitScheduleItemResultResponse = z.infer<typeof VisitScheduleItemResultResponseSchema>;

export const PublicApproverVisitLinkResponseSchema = z.object({
  role: z.string(),
  officeName: z.string(),
  managerDisplayName: z.string(),
  candidateWindow: z.object({ startDate: z.iso.date(), endDate: z.iso.date() }),
  propertyAddress: z.string(),
  submittedTimeSlots: z.array(z.unknown()),
  responseVersion: z.number(),
  coordinationStatus: z.string(),
  managerLegalRole: z.enum(["REPRESENTATIVE_AGENT", "AFFILIATED_AGENT", "ASSISTANT"]),
  linkExpiresAt: z.iso.datetime({ offset: true }),
  officeContactPhone: z.string(),
  privacyNotice: z.object({
    purpose: z.string(),
    collectedItems: z.array(z.string()),
    retentionPeriod: z.string(),
  }),
  approvalValidFrom: z.iso.datetime({ offset: true }),
  approvalValidUntil: z.iso.datetime({ offset: true }),
  defaultTimeSlots: z.array(
    z.object({
      startsAt: z.iso.datetime({ offset: true }),
      endsAt: z.iso.datetime({ offset: true }),
    }),
  ),
  propertyVisitState: z.enum(["PENDING", "COMPLETED", "NO_SHOW", "CANCELLED"]),
});
export type PublicApproverVisitLinkResponse = z.infer<typeof PublicApproverVisitLinkResponseSchema>;

export const ApproverAvailableTimesResponseSchema = z.object({
  coordinationId: z.number(),
  responseVersion: z.number(),
  submittedAt: z.string(),
});
export type ApproverAvailableTimesResponse = z.infer<typeof ApproverAvailableTimesResponseSchema>;

export const PublicVisitLinkResponseSchema = z.object({
  role: z.enum(["CUSTOMER", "APPROVER"]),
  officeName: z.string(),
  managerDisplayName: z.string(),
  candidateWindow: z.object({ startDate: z.iso.date(), endDate: z.iso.date() }),
  candidateProperties: z
    .array(
      z.object({ candidatePropertyId: z.number(), displayName: z.string(), district: z.string() }),
    )
    .nullable()
    .optional(),
  submittedTimeSlots: z.unknown(),
  responseVersion: z.number(),
  coordinationStatus: z.string(),
  propertyAddress: z.string().nullable().optional(),
  managerLegalRole: z.enum(["REPRESENTATIVE_AGENT", "AFFILIATED_AGENT", "ASSISTANT"]),
  linkExpiresAt: z.iso.datetime({ offset: true }),
  officeContactPhone: z.string(),
  privacyNotice: z.object({
    purpose: z.string(),
    collectedItems: z.array(z.string()),
    retentionPeriod: z.string(),
    noticeCode: z.string(),
    noticeVersion: z.string(),
    retentionDays: z.number(),
  }),
  approvalValidFrom: z.iso.datetime({ offset: true }).nullable().optional(),
  approvalValidUntil: z.iso.datetime({ offset: true }).nullable().optional(),
  defaultTimeSlots: z
    .array(
      z.object({
        startsAt: z.iso.datetime({ offset: true }).nullable().optional(),
        endsAt: z.iso.datetime({ offset: true }).nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  propertyVisitState: z
    .enum(["PENDING", "COMPLETED", "NO_SHOW", "CANCELLED"])
    .nullable()
    .optional(),
});
export type PublicVisitLinkResponse = z.infer<typeof PublicVisitLinkResponseSchema>;

export const AvailableTimesSubmitRequestSchema = z.object({
  timeSlots: z.array(
    z.object({
      startsAt: z.iso.datetime({ offset: true }),
      endsAt: z.iso.datetime({ offset: true }),
    }),
  ),
  acknowledgedNoticeVersion: z.string(),
});
export type AvailableTimesSubmitRequest = z.infer<typeof AvailableTimesSubmitRequestSchema>;

export const CustomerAvailableTimesResponseSchema = z.object({
  coordinationId: z.number(),
  responseVersion: z.number(),
  submittedAt: z.string(),
});
export type CustomerAvailableTimesResponse = z.infer<typeof CustomerAvailableTimesResponseSchema>;

export const PublicConfirmedVisitResponseSchema = z.object({
  state: z.enum(["VALID", "CANCELLED", "RESCHEDULE_REQUIRED", "SUPERSEDED"]),
  scheduleVersion: z.number(),
  managerDisplayName: z.string(),
  managerLegalRole: z.enum(["REPRESENTATIVE_AGENT", "AFFILIATED_AGENT", "ASSISTANT"]),
  officeContactPhone: z.string(),
  items: z.array(
    z.object({
      sortOrder: z.number(),
      scheduledStartAt: z.iso.datetime({ offset: true }),
      scheduledEndAt: z.iso.datetime({ offset: true }),
      propertyAddress: z.string(),
      travelDurationMinutes: z.number().nullable(),
    }),
  ),
});
export type PublicConfirmedVisitResponse = z.infer<typeof PublicConfirmedVisitResponseSchema>;

export const VisitCoordinationManagerChangeRequestSchema = z.object({
  managerMembershipId: z.number(),
});
export type VisitCoordinationManagerChangeRequest = z.infer<
  typeof VisitCoordinationManagerChangeRequestSchema
>;

export const ConfirmationMessagesResponseSchema = z.object({
  scheduleVersion: z.number(),
  customerMessage: z.string(),
  approverMessages: z.array(
    z.object({
      candidatePropertyId: z.number(),
      approvalId: z.number(),
      approverName: z.string(),
      message: z.string(),
    }),
  ),
});
export type ConfirmationMessagesResponse = z.infer<typeof ConfirmationMessagesResponseSchema>;

export const ConfirmationDeliveryListResponseSchema = z.object({
  items: z.array(
    z.object({
      deliveryId: z.number(),
      scheduleVersion: z.number(),
      recipientType: z.enum(["CUSTOMER", "APPROVER"]),
      candidatePropertyId: z.number().nullable(),
      delivered: z.boolean(),
      channel: z.string().nullable(),
      deliveredAt: z.iso.datetime({ offset: true }).nullable(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
});
export type ConfirmationDeliveryListResponse = z.infer<
  typeof ConfirmationDeliveryListResponseSchema
>;

export const VisitScheduleItemResultHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      historyId: z.number(),
      previousResult: z.string().nullable(),
      newResult: z.string(),
      previousActualVisitedAt: z.iso.datetime({ offset: true }).nullable(),
      newActualVisitedAt: z.iso.datetime({ offset: true }).nullable(),
      correctionReason: z.string().nullable(),
      effectiveAt: z.iso.datetime({ offset: true }),
      recordedAt: z.iso.datetime({ offset: true }),
      recordedByName: z.string(),
    }),
  ),
});
export type VisitScheduleItemResultHistoryResponse = z.infer<
  typeof VisitScheduleItemResultHistoryResponseSchema
>;

export const StaffAccessRevocationRequestSchema = z.object({
  approvalId: z.number(),
  revokedAt: z.iso.datetime({ offset: true }),
  revocationReason: z.string(),
});
export type StaffAccessRevocationRequest = z.infer<typeof StaffAccessRevocationRequestSchema>;

export const VisitCoordinationCloneRequestSchema = z.object({
  periodStartDate: z.iso.date(),
  periodEndDate: z.iso.date(),
});
export type VisitCoordinationCloneRequest = z.infer<typeof VisitCoordinationCloneRequestSchema>;

export const AssistantNoticeListResponseSchema = z.object({
  items: z.array(
    z.object({
      noticeId: z.number(),
      recipientType: z.string(),
      recipientName: z.string(),
      noticeMethod: z.string(),
      notifiedAt: z.iso.datetime({ offset: true }).nullable(),
      missingExceptionReason: z.string().nullable(),
      followupAction: z.string().nullable(),
      recordedAfterTheFact: z.boolean(),
      confirmedAt: z.iso.datetime({ offset: true }).nullable(),
    }),
  ),
  requiredRecipients: z.array(
    z.object({
      recipientType: z.string(),
      candidatePropertyId: z.number().nullable(),
      recorded: z.boolean(),
    }),
  ),
});
export type AssistantNoticeListResponse = z.infer<typeof AssistantNoticeListResponseSchema>;

export const AssistantNoticeSupervisionListResponseSchema = z.object({
  items: z.array(
    z.object({
      noticeId: z.number(),
      scheduleItemId: z.number(),
      assistantMembershipId: z.number(),
      recipientType: z.string(),
      notifiedAt: z.iso.datetime({ offset: true }).nullable(),
      recordedAfterTheFact: z.boolean(),
      confirmedAt: z.iso.datetime({ offset: true }).nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type AssistantNoticeSupervisionListResponse = z.infer<
  typeof AssistantNoticeSupervisionListResponseSchema
>;

export const PublicApproverConfirmedVisitResponseSchema = z.object({
  state: z.enum(["VALID", "CANCELLED", "RESCHEDULE_REQUIRED", "SUPERSEDED"]),
  scheduleVersion: z.number(),
  managerDisplayName: z.string(),
  managerLegalRole: z.enum(["REPRESENTATIVE_AGENT", "AFFILIATED_AGENT", "ASSISTANT"]),
  propertyAddress: z.string(),
  scheduledStartAt: z.iso.datetime({ offset: true }).nullable(),
  scheduledEndAt: z.iso.datetime({ offset: true }).nullable(),
  officeContactPhone: z.string(),
});
export type PublicApproverConfirmedVisitResponse = z.infer<
  typeof PublicApproverConfirmedVisitResponseSchema
>;

export const BrokerReceivedVisitReviewListResponseSchema = z.object({
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  items: z.array(
    z.object({
      reviewId: z.number(),
      scheduleItemId: z.number(),
      actualVisitedAt: z.iso.datetime({ offset: true }),
      propertyName: z.string(),
      reviewedBrokerName: z.string(),
      reviewStatus: z.enum(["ACTIVE", "DISPUTED", "REMOVED"]),
      answers: z.object({
        punctuality: z.enum(["YES", "NO", "SKIP"]),
        advanceContact: z.enum(["YES", "NO", "SKIP"]),
        asRequested: z.enum(["YES", "NO", "SKIP"]),
      }),
      submittedAt: z.iso.datetime({ offset: true }),
      lastRevisedAt: z.iso.datetime({ offset: true }),
      canDispute: z.boolean(),
      dispute: z
        .object({
          disputeId: z.number().optional(),
          status: z.enum(["OPEN", "UPHELD", "REMOVED"]).optional(),
          filedAt: z.iso.datetime({ offset: true }).optional(),
          decidedAt: z.iso.datetime({ offset: true }).nullable().optional(),
          decisionNote: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    }),
  ),
});
export type BrokerReceivedVisitReviewListResponse = z.infer<
  typeof BrokerReceivedVisitReviewListResponseSchema
>;

export const BrokerVisitTrustSummaryResponseSchema = z.object({
  policyVersion: z.string(),
  asOf: z.iso.datetime({ offset: true }),
  windowMonths: z.number(),
  state: z.enum(["NO_DATA", "INSUFFICIENT", "AVAILABLE"]),
  overallBand: z.enum(["HIGH", "MID", "LOW"]).nullable().optional(),
  completedVisitCount: z.number(),
  evaluatedVisitCount: z.number(),
  distinctApproverCount: z.number(),
  excludedReviewCount: z.number(),
  indicators: z.array(
    z.object({
      indicator: z.enum(["PUNCTUALITY", "ADVANCE_CONTACT", "AS_REQUESTED"]),
      answeredCount: z.number(),
      yesCount: z.number(),
      band: z.enum(["HIGH", "MID", "LOW"]).nullable().optional(),
    }),
  ),
  unconfirmedIndicators: z.array(z.unknown()),
});
export type BrokerVisitTrustSummaryResponse = z.infer<typeof BrokerVisitTrustSummaryResponseSchema>;

export const VisitReviewDisputeCreateRequestSchema = z.object({
  reasonCode: z.enum(["FACT_INCORRECT", "WRONG_TARGET", "OTHER"]),
  reasonText: z.string(),
});
export type VisitReviewDisputeCreateRequest = z.infer<typeof VisitReviewDisputeCreateRequestSchema>;

export const VisitReviewDisputeResponseSchema = z.object({
  disputeId: z.number(),
  reviewId: z.number(),
  status: z.string(),
  reasonCode: z.enum(["FACT_INCORRECT", "WRONG_TARGET", "OTHER"]),
  filedAt: z.iso.datetime({ offset: true }),
  targetDecisionAt: z.iso.datetime({ offset: true }),
  reviewStatus: z.string(),
});
export type VisitReviewDisputeResponse = z.infer<typeof VisitReviewDisputeResponseSchema>;

export const ApplyGrantCreateRequestSchema = z.object({
  granteeOfficeId: z.number(),
  granteeMembershipId: z.number().nullable().optional(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type ApplyGrantCreateRequest = z.infer<typeof ApplyGrantCreateRequestSchema>;

export const ApplyGrantListResponseSchema = z.object({
  items: z.array(z.unknown()),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type ApplyGrantListResponse = z.infer<typeof ApplyGrantListResponseSchema>;

export const ApplyGrantResponseSchema = z.object({
  grantId: z.number(),
  approvalId: z.number(),
  propertyId: z.number(),
  ownerOfficeId: z.number(),
  granteeOfficeId: z.number(),
  granteeOfficeName: z.string(),
  granteeMembershipId: z.number().nullable().optional(),
  granteeMemberName: z.string().nullable().optional(),
  scope: z.enum(["OFFICE", "MEMBER"]),
  grantedByMembershipId: z.number(),
  grantedByName: z.string(),
  grantedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  revokedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  revokeSource: z.enum(["OFFICE", "SYSTEM"]).nullable().optional(),
  revokeReason: z.string().nullable().optional(),
  state: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]),
  openRequestCount: z.number(),
});
export type ApplyGrantResponse = z.infer<typeof ApplyGrantResponseSchema>;

export const ApplyGrantRevokeRequestSchema = z.object({ reason: z.string() });
export type ApplyGrantRevokeRequest = z.infer<typeof ApplyGrantRevokeRequestSchema>;

export const ApplyGrantRevokeResponseSchema = z.object({
  grant: z.record(z.string(), z.unknown()),
  closedRequestIds: z.array(z.unknown()),
  keptScheduleItemIds: z.array(z.unknown()),
});
export type ApplyGrantRevokeResponse = z.infer<typeof ApplyGrantRevokeResponseSchema>;

export const CrossOfficeRequestListResponseSchema = z.object({
  items: z.array(
    z.object({
      requestId: z.number(),
      requestKind: z.enum(["NEW", "CHANGE"]),
      status: z.string(),
      applicantOfficeName: z.string(),
      applicantBrokerName: z.string(),
      requestedStartAt: z.iso.datetime({ offset: true }),
      requestedEndAt: z.iso.datetime({ offset: true }),
      expectedDurationMinutes: z.number(),
      submittedAt: z.iso.datetime({ offset: true }),
      closedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      closeReasonCode: z
        .enum(["START_PASSED", "CONDITION_EXPIRED", "GRANT_REVOKED", "GRANT_EXPIRED"])
        .nullable()
        .optional(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type CrossOfficeRequestListResponse = z.infer<typeof CrossOfficeRequestListResponseSchema>;

export const CrossOfficeScheduleListResponseSchema = z.object({
  items: z.array(
    z.object({
      scheduleItemId: z.number(),
      scheduledStartAt: z.iso.datetime({ offset: true }),
      scheduledEndAt: z.iso.datetime({ offset: true }),
      result: z.enum(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
      state: z.enum(["VALID", "RESCHEDULE_REQUIRED"]),
      applicantOfficeName: z.string(),
      applicantBrokerName: z.string(),
      confirmedRequestId: z.number(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type CrossOfficeScheduleListResponse = z.infer<typeof CrossOfficeScheduleListResponseSchema>;

export const ReceivedApplyGrantListResponseSchema = z.object({
  items: z.array(
    z.object({
      grantId: z.number(),
      approvalId: z.number(),
      propertyId: z.number(),
      ownerOfficeId: z.number(),
      ownerOfficeName: z.string(),
      scope: z.enum(["OFFICE", "MEMBER"]),
      granteeMembershipId: z.number().nullable().optional(),
      propertyName: z.string(),
      propertyAddress: z.string(),
      categoryName: z.string(),
      dealTypes: z.array(z.unknown()),
      approvalValidUntil: z.iso.datetime({ offset: true }),
      grantExpiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
      conditionRegistered: z.boolean(),
      conditionAppliesUntil: z.iso.datetime({ offset: true }).nullable().optional(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type ReceivedApplyGrantListResponse = z.infer<typeof ReceivedApplyGrantListResponseSchema>;

export const ApproverPreferredBrokerCreateRequestSchema = z.object({
  sourceRequestId: z.number().optional(),
  sourceScheduleItemId: z.number().optional(),
  acknowledgedNoticeVersion: z.string(),
});
export type ApproverPreferredBrokerCreateRequest = z.infer<
  typeof ApproverPreferredBrokerCreateRequestSchema
>;

export const ApproverPreferredBrokerListResponseSchema = z.object({
  maxActiveCount: z.number(),
  items: z.array(
    z.object({
      preferredBrokerId: z.number(),
      applicantOfficeName: z.string(),
      applicantBrokerName: z.string(),
      designatedAt: z.iso.datetime({ offset: true }),
    }),
  ),
  candidates: z.array(
    z.object({
      sourceRequestId: z.number().nullable().optional(),
      sourceScheduleItemId: z.number().nullable().optional(),
      applicantOfficeName: z.string(),
      applicantBrokerName: z.string(),
    }),
  ),
  privacyNotice: z.object({
    noticeCode: z.string(),
    noticeVersion: z.string(),
    retentionDays: z.number(),
  }),
});
export type ApproverPreferredBrokerListResponse = z.infer<
  typeof ApproverPreferredBrokerListResponseSchema
>;

export const ApproverPreferredBrokerResponseSchema = z.object({
  preferredBrokerId: z.number(),
  applicantOfficeName: z.string(),
  applicantBrokerName: z.string(),
  designatedAt: z.iso.datetime({ offset: true }),
  releasedAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type ApproverPreferredBrokerResponse = z.infer<typeof ApproverPreferredBrokerResponseSchema>;

export const ApproverVisitReviewListResponseSchema = z.object({
  propertyAddress: z.string(),
  reviewWindowDays: z.number(),
  items: z.array(
    z.object({
      scheduleItemId: z.number(),
      scheduledStartAt: z.iso.datetime({ offset: true }),
      scheduledEndAt: z.iso.datetime({ offset: true }),
      actualVisitedAt: z.iso.datetime({ offset: true }),
      applicantOfficeName: z.string(),
      applicantBrokerName: z.string(),
      reviewDeadlineAt: z.iso.datetime({ offset: true }),
      reviewStatus: z.enum(["NONE", "SUBMITTED", "WITHDRAWN", "LOCKED"]),
      editable: z.boolean(),
      revisionCount: z.number(),
      revisionsRemaining: z.number(),
      version: z.number().nullable().optional(),
      answers: z
        .object({
          punctuality: z.enum(["YES", "NO", "SKIP"]).optional(),
          advanceContact: z.enum(["YES", "NO", "SKIP"]).optional(),
          asRequested: z.enum(["YES", "NO", "SKIP"]).optional(),
        })
        .nullable()
        .optional(),
      isPreferredBroker: z.boolean(),
    }),
  ),
  privacyNotice: z.object({
    noticeCode: z.string(),
    noticeVersion: z.string(),
    retentionDays: z.number(),
  }),
});
export type ApproverVisitReviewListResponse = z.infer<typeof ApproverVisitReviewListResponseSchema>;

export const ApproverVisitReviewResponseSchema = z.object({
  scheduleItemId: z.number(),
  reviewStatus: z.enum(["SUBMITTED", "WITHDRAWN"]),
  answers: z
    .object({
      punctuality: z.enum(["YES", "NO", "SKIP"]).optional(),
      advanceContact: z.enum(["YES", "NO", "SKIP"]).optional(),
      asRequested: z.enum(["YES", "NO", "SKIP"]).optional(),
    })
    .nullable()
    .optional(),
  revisionCount: z.number(),
  revisionsRemaining: z.number(),
  reviewDeadlineAt: z.iso.datetime({ offset: true }),
  submittedAt: z.iso.datetime({ offset: true }),
  lastRevisedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type ApproverVisitReviewResponse = z.infer<typeof ApproverVisitReviewResponseSchema>;

export const ApproverVisitReviewUpsertRequestSchema = z.object({
  punctuality: z.enum(["YES", "NO", "SKIP"]),
  advanceContact: z.enum(["YES", "NO", "SKIP"]),
  asRequested: z.enum(["YES", "NO", "SKIP"]),
  acknowledgedNoticeVersion: z.string(),
});
export type ApproverVisitReviewUpsertRequest = z.infer<
  typeof ApproverVisitReviewUpsertRequestSchema
>;

export const ApproverApprovalUnlinkResponseSchema = z.object({});
export type ApproverApprovalUnlinkResponse = z.infer<typeof ApproverApprovalUnlinkResponseSchema>;

export const ApproverConditionBulkApplyRequestSchema = z.object({
  approvalIds: z.array(z.unknown()),
  condition: z.record(z.string(), z.unknown()),
  impactAcknowledgedApprovalIds: z.array(z.unknown()).nullable().optional(),
  acknowledgedNoticeVersion: z.string(),
});
export type ApproverConditionBulkApplyRequest = z.infer<
  typeof ApproverConditionBulkApplyRequestSchema
>;

export const ApproverConditionBulkApplyResponseSchema = z.object({
  batchId: z.number(),
  requestedCount: z.number(),
  appliedCount: z.number(),
  needsImpactAckCount: z.number(),
  failedCount: z.number(),
  items: z.array(
    z.object({
      approvalId: z.number(),
      result: z.enum(["APPLIED", "NEEDS_IMPACT_ACK", "FAILED"]),
      conditionId: z.number().nullable().optional(),
      versionNo: z.number().nullable().optional(),
      failureCode: z
        .enum([
          "NOT_LINKED",
          "NOT_PRIMARY",
          "APPROVAL_INACTIVE",
          "OFFICE_RESTRICTED",
          "INVALID_CONDITION",
        ])
        .nullable()
        .optional(),
      affectedItemCount: z.number(),
    }),
  ),
});
export type ApproverConditionBulkApplyResponse = z.infer<
  typeof ApproverConditionBulkApplyResponseSchema
>;

export const ApproverConditionBulkPreviewRequestSchema = z.object({
  approvalIds: z.array(z.unknown()),
  condition: z.record(z.string(), z.unknown()),
});
export type ApproverConditionBulkPreviewRequest = z.infer<
  typeof ApproverConditionBulkPreviewRequestSchema
>;

export const ApproverConditionBulkPreviewResponseSchema = z.object({
  items: z.array(
    z.object({
      approvalId: z.number(),
      propertyDisplayName: z.string().nullable().optional(),
      eligible: z.boolean(),
      ineligibleReason: z
        .enum(["NOT_LINKED", "NOT_PRIMARY", "APPROVAL_INACTIVE", "OFFICE_RESTRICTED"])
        .nullable()
        .optional(),
      hasImpact: z.boolean(),
      affectedItems: z.array(z.unknown()),
    }),
  ),
});
export type ApproverConditionBulkPreviewResponse = z.infer<
  typeof ApproverConditionBulkPreviewResponseSchema
>;

export const ApproverLinkDecisionRequestSchema = z.object({
  decision: z.enum(["ACCEPT", "REJECT"]),
});
export type ApproverLinkDecisionRequest = z.infer<typeof ApproverLinkDecisionRequestSchema>;

export const ApproverLinkDecisionResponseSchema = z.object({
  approvalId: z.number(),
  linkState: z.enum(["LINKED", "REJECTED"]),
});
export type ApproverLinkDecisionResponse = z.infer<typeof ApproverLinkDecisionResponseSchema>;

export const ApproverLogoutResponseSchema = z.object({});
export type ApproverLogoutResponse = z.infer<typeof ApproverLogoutResponseSchema>;

export const ApproverOtpSendRequestSchema = z.object({
  purpose: z.enum(["CLAIM", "LOGIN", "REAUTH"]),
  phone: z.string(),
  linkToken: z.string().nullable().optional(),
});
export type ApproverOtpSendRequest = z.infer<typeof ApproverOtpSendRequestSchema>;

export const ApproverOtpSendResponseSchema = z.object({
  accepted: z.boolean(),
  expiresInSeconds: z.number(),
  resendAfterSeconds: z.number(),
});
export type ApproverOtpSendResponse = z.infer<typeof ApproverOtpSendResponseSchema>;

export const ApproverOtpVerifyRequestSchema = z.object({
  purpose: z.enum(["CLAIM", "LOGIN", "REAUTH"]),
  phone: z.string(),
  code: z.string(),
  linkToken: z.string().nullable().optional(),
  acknowledgedNoticeVersion: z.string().nullable().optional(),
});
export type ApproverOtpVerifyRequest = z.infer<typeof ApproverOtpVerifyRequestSchema>;

export const ApproverPortalApprovalListResponseSchema = z.object({
  items: z.array(
    z.object({
      approvalId: z.number(),
      linkState: z.enum(["LINKED", "PENDING_CONFIRM"]),
      propertyDisplayName: z.string().nullable().optional(),
      propertyAddress: z.string().nullable().optional(),
      propertyRegion: z.string(),
      approverType: z.enum(["OCCUPANT", "OWNER", "DELEGATE"]),
      approvalRole: z.enum(["PRIMARY", "CO_APPROVER"]),
      ownerOfficeName: z.string(),
      officeContactPhone: z.string().nullable().optional(),
      approvalValidFrom: z.iso.datetime({ offset: true }),
      approvalValidUntil: z.iso.datetime({ offset: true }),
      approvalActive: z.boolean(),
      activeConditionVersionNo: z.number().nullable().optional(),
      conditionAppliesUntil: z.iso.datetime({ offset: true }).nullable().optional(),
      pendingRequestCount: z.number(),
      upcomingConfirmedVisitCount: z.number(),
      nextConfirmedVisitAt: z.iso.datetime({ offset: true }).nullable().optional(),
    }),
  ),
  privacyNotice: z.object({
    noticeCode: z.string(),
    noticeVersion: z.string(),
    retentionDays: z.number(),
  }),
});
export type ApproverPortalApprovalListResponse = z.infer<
  typeof ApproverPortalApprovalListResponseSchema
>;

export const ApproverProfileCloseRequestSchema = z.object({ confirm: z.boolean() });
export type ApproverProfileCloseRequest = z.infer<typeof ApproverProfileCloseRequestSchema>;

export const ApproverProfileCloseResponseSchema = z.object({
  closedAt: z.iso.datetime({ offset: true }),
  unlinkedApprovalCount: z.number(),
  endedSessionCount: z.number(),
});
export type ApproverProfileCloseResponse = z.infer<typeof ApproverProfileCloseResponseSchema>;

export const ApproverProfileResponseSchema = z.object({
  profileId: z.number(),
  maskedPhone: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  lastLoginAt: z.iso.datetime({ offset: true }),
  linkedApprovalCount: z.number(),
  pendingConfirmCount: z.number(),
});
export type ApproverProfileResponse = z.infer<typeof ApproverProfileResponseSchema>;

export const ApproverSessionResponseSchema = z.object({
  profileId: z.number(),
  maskedPhone: z.string(),
  sessionIdleTimeoutMinutes: z.number(),
  sessionExpiresAt: z.iso.datetime({ offset: true }),
  reauthValidUntil: z.iso.datetime({ offset: true }).nullable().optional(),
  claimedApprovalId: z.number().nullable().optional(),
  profileCreated: z.boolean(),
  linkedApprovalCount: z.number(),
  pendingConfirmCount: z.number(),
  privacyNotice: z.object({
    noticeCode: z.string(),
    noticeVersion: z.string(),
    retentionDays: z.number(),
  }),
});
export type ApproverSessionResponse = z.infer<typeof ApproverSessionResponseSchema>;

export const GuestPrivacyIntakeRequestSchema = z.object({
  linkKind: z.string(),
  token: z.string(),
  requestType: z.string(),
  requesterRole: z.string(),
  contactChannel: z.string(),
  contact: z.string(),
  requestNote: z.string().nullable().optional(),
  acknowledgedNoticeVersion: z.string(),
});
export type GuestPrivacyIntakeRequest = z.infer<typeof GuestPrivacyIntakeRequestSchema>;

export const GuestPrivacyIntakeResponseSchema = z.object({
  receivedAt: z.iso.datetime({ offset: true }),
  resultDueAt: z.iso.datetime({ offset: true }),
  contactChannel: z.string(),
  maskedContact: z.string(),
});
export type GuestPrivacyIntakeResponse = z.infer<typeof GuestPrivacyIntakeResponseSchema>;

export const ApproverConditionUpsertRequestSchema = z.object({
  appliesFrom: z.iso.datetime({ offset: true }),
  appliesUntil: z.iso.datetime({ offset: true }),
  maxVisitsPerDay: z.number().nullable().optional(),
  minGapMinutes: z.number().nullable().optional(),
  minLeadMinutes: z.number().nullable().optional(),
  singleVisitMaxMinutes: z.number().nullable().optional(),
  groupingPreference: z.enum(["CONSECUTIVE", "SPREAD"]).nullable().optional(),
  windows: z.array(
    z.object({
      windowType: z.enum(["WEEKDAY", "DATE"]),
      weekday: z.number().nullable().optional(),
      windowDate: z.iso.date().nullable().optional(),
      startsTime: z.string(),
      endsTime: z.string(),
      isException: z.boolean(),
    }),
  ),
  dateRules: z
    .array(
      z.object({
        ruleDate: z.iso.date(),
        maxVisitsPerDay: z
          .object({
            kind: z.enum(["VALUE", "UNLIMITED"]).optional(),
            value: z.number().nullable().optional(),
          })
          .nullable()
          .optional(),
        minGapMinutes: z
          .object({
            kind: z.enum(["VALUE", "UNLIMITED"]).optional(),
            value: z.number().nullable().optional(),
          })
          .nullable()
          .optional(),
        minLeadMinutes: z
          .object({
            kind: z.enum(["VALUE", "UNLIMITED"]).optional(),
            value: z.number().nullable().optional(),
          })
          .nullable()
          .optional(),
        singleVisitMaxMinutes: z
          .object({
            kind: z.enum(["VALUE", "UNLIMITED"]).optional(),
            value: z.number().nullable().optional(),
          })
          .nullable()
          .optional(),
      }),
    )
    .nullable()
    .optional(),
  impactAcknowledged: z.boolean(),
  acknowledgedNoticeVersion: z.string(),
});
export type ApproverConditionUpsertRequest = z.infer<typeof ApproverConditionUpsertRequestSchema>;

export const ApproverConditionResponseSchema = z.object({
  conditionId: z.number(),
  approvalId: z.number(),
  versionNo: z.number(),
  status: z.enum(["ACTIVE", "SUPERSEDED"]),
  appliesFrom: z.iso.datetime({ offset: true }),
  appliesUntil: z.iso.datetime({ offset: true }),
  maxVisitsPerDay: z.number().nullable().optional(),
  minGapMinutes: z.number().nullable().optional(),
  minLeadMinutes: z.number().nullable().optional(),
  singleVisitMaxMinutes: z.number().nullable().optional(),
  groupingPreference: z.enum(["CONSECUTIVE", "SPREAD"]).nullable().optional(),
  source: z.enum(["DIRECT", "PROXY"]),
  windows: z.array(
    z.object({
      windowType: z.enum(["WEEKDAY", "DATE"]),
      weekday: z.number().nullable().optional(),
      windowDate: z.iso.date().nullable().optional(),
      startsTime: z.string(),
      endsTime: z.string(),
      isException: z.boolean(),
    }),
  ),
  normalizedRanges: z.array(
    z.object({
      windowType: z.enum(["WEEKDAY", "DATE"]),
      weekday: z.number().nullable().optional(),
      windowDate: z.iso.date().nullable().optional(),
      startsTime: z.string(),
      endsTime: z.string(),
      isException: z.boolean(),
    }),
  ),
  normalizationApplied: z.boolean(),
  registeredAt: z.iso.datetime({ offset: true }),
  supersededAt: z.iso.datetime({ offset: true }).nullable().optional(),
  dateRules: z.array(z.unknown()),
  dateRuleReplacedCount: z.number(),
  enteredViaProfile: z.boolean(),
  privacyNotice: z.object({
    noticeCode: z.string(),
    noticeVersion: z.string(),
    retentionDays: z.number(),
  }),
});
export type ApproverConditionResponse = z.infer<typeof ApproverConditionResponseSchema>;

export const ApproverConditionImpactPreviewResponseSchema = z.object({
  hasImpact: z.boolean(),
  affectedItems: z.array(
    z.object({
      scheduleItemId: z.number(),
      scheduledStartAt: z.iso.datetime({ offset: true }),
      scheduledEndAt: z.iso.datetime({ offset: true }),
      violatedRules: z.array(z.unknown()),
    }),
  ),
});
export type ApproverConditionImpactPreviewResponse = z.infer<
  typeof ApproverConditionImpactPreviewResponseSchema
>;

export const ApproverVisitRequestCompareResponseSchema = z.object({
  propertyAddress: z.string(),
  activeConditionVersionNo: z.number().nullable().optional(),
  approvalRole: z.enum(["PRIMARY", "CO_APPROVER"]),
  grantedOfficeNames: z.array(z.unknown()),
  items: z.array(
    z.object({
      requestId: z.number(),
      requestKind: z.enum(["NEW", "CHANGE"]),
      status: z.string(),
      applicantOfficeName: z.string(),
      applicantBrokerName: z.string(),
      applicantRelation: z.enum(["OWNER_OFFICE", "GRANTED_OFFICE"]),
      requestedStartAt: z.iso.datetime({ offset: true }),
      requestedEndAt: z.iso.datetime({ offset: true }),
      expectedDurationMinutes: z.number(),
      partySize: z.number().nullable().optional(),
      requestNote: z.string().nullable().optional(),
      submittedAt: z.iso.datetime({ offset: true }),
      applicantHistory: z.object({
        previousCompletedVisitCount: z.number(),
        previousCancelledVisitCount: z.number(),
      }),
      isPreferredBroker: z.boolean(),
      applicantTrust: z
        .object({
          state: z.enum(["NO_DATA", "INSUFFICIENT", "AVAILABLE"]).optional(),
          overallBand: z.enum(["HIGH", "MID", "LOW"]).nullable().optional(),
          completedVisitCount: z.number().optional(),
          evaluatedVisitCount: z.number().optional(),
          distinctApproverCount: z.number().nullable().optional(),
          indicators: z
            .array(
              z.object({
                indicator: z.enum(["PUNCTUALITY", "ADVANCE_CONTACT", "AS_REQUESTED"]),
                answeredCount: z.number().nullable().optional(),
                yesCount: z.number().nullable().optional(),
                band: z.enum(["HIGH", "MID", "LOW"]).nullable().optional(),
              }),
            )
            .optional(),
        })
        .nullable()
        .optional(),
    }),
  ),
  trustPolicyVersion: z.string(),
  trustAsOf: z.iso.datetime({ offset: true }),
  unconfirmedIndicators: z.array(z.unknown()),
  privacyNotice: z.object({
    noticeCode: z.string(),
    noticeVersion: z.string(),
    retentionDays: z.number(),
  }),
});
export type ApproverVisitRequestCompareResponse = z.infer<
  typeof ApproverVisitRequestCompareResponseSchema
>;

export const ApproverSelectionRequestSchema = z.object({
  comparedRequestIds: z.array(z.unknown()),
  selectionNote: z.string().nullable().optional(),
  acknowledgedNoticeVersion: z.string(),
});
export type ApproverSelectionRequest = z.infer<typeof ApproverSelectionRequestSchema>;

export const ApproverSelectionResponseSchema = z.object({
  selectionId: z.number(),
  requestId: z.number(),
  requestStatus: z.enum(["CONFIRMED", "REVALIDATION_FAILED"]),
  revalidation: z.object({
    result: z.enum(["PASSED", "FAILED"]),
    failureCode: z.string().nullable().optional(),
    failureDetail: z.string().nullable().optional(),
    checkedAt: z.iso.datetime({ offset: true }),
  }),
  timeClosedRequestIds: z.array(z.unknown()),
});
export type ApproverSelectionResponse = z.infer<typeof ApproverSelectionResponseSchema>;

export const ApproverConfirmedScheduleResponseSchema = z.object({
  items: z.array(
    z.object({
      scheduleItemId: z.number(),
      scheduledStartAt: z.iso.datetime({ offset: true }),
      scheduledEndAt: z.iso.datetime({ offset: true }),
      result: z.enum(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
      state: z.enum(["VALID", "RESCHEDULE_REQUIRED"]),
      confirmedRequestId: z.number().nullable().optional(),
      applicantOfficeName: z.string(),
      applicantBrokerName: z.string(),
      applicantRelation: z.enum(["OWNER_OFFICE", "GRANTED_OFFICE"]),
    }),
  ),
  officeName: z.string(),
  officeContactPhone: z.string(),
});
export type ApproverConfirmedScheduleResponse = z.infer<
  typeof ApproverConfirmedScheduleResponseSchema
>;

export const VisitCoordinationCloneResponseSchema = z.object({
  coordinationId: z.number(),
  status: z.string(),
  candidateProperties: z.array(
    z.object({ candidatePropertyId: z.number(), propertyId: z.number(), sortOrder: z.number() }),
  ),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type VisitCoordinationCloneResponse = z.infer<typeof VisitCoordinationCloneResponseSchema>;

export const VisitAccessRevocationResponseSchema = z.object({
  approvalId: z.number(),
  coordinationId: z.number(),
  officeId: z.number(),
  revokedAt: z.iso.datetime({ offset: true }),
  revocationRecordedAt: z.iso.datetime({ offset: true }),
  revokedByUserId: z.number(),
  status: z.string(),
  version: z.number(),
});
export type VisitAccessRevocationResponse = z.infer<typeof VisitAccessRevocationResponseSchema>;

export const VisitManagerUpdateResponseSchema = z.object({
  coordinationId: z.number(),
  status: z.string(),
  customerId: z.number(),
  customerName: z.string(),
  managerMembershipId: z.number(),
  periodStartDate: z.iso.date(),
  periodEndDate: z.iso.date(),
  candidateProperties: z.array(
    z.object({
      candidatePropertyId: z.number(),
      propertyId: z.number(),
      sortOrder: z.number(),
      propertyName: z.string(),
      propertyAddress: z.string().nullable().optional(),
      approverRespondedAt: z.iso.datetime({ offset: true }).nullable(),
      approverTimeSlots: z.array(
        z.object({
          startsAt: z.iso.datetime({ offset: true }),
          endsAt: z.iso.datetime({ offset: true }),
        }),
      ),
    }),
  ),
  customerRespondedAt: z.iso.datetime({ offset: true }).nullable(),
  customerTimeSlots: z.array(
    z.object({
      startsAt: z.iso.datetime({ offset: true }),
      endsAt: z.iso.datetime({ offset: true }),
    }),
  ),
  scheduleItems: z
    .array(
      z.object({
        itemId: z.number(),
        candidatePropertyId: z.number(),
        scheduledStartAt: z.iso.datetime({ offset: true }).nullable(),
        scheduledEndAt: z.iso.datetime({ offset: true }).nullable(),
        result: z.enum(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
        resultRecordedAt: z.iso.datetime({ offset: true }).nullable(),
        correctionCount: z.number(),
      }),
    )
    .nullable()
    .optional(),
  affectedItems: z.array(
    z.object({
      scheduleItemId: z.number(),
      candidatePropertyId: z.number(),
      state: z.string(),
      reason: z.string(),
    }),
  ),
  managerName: z.string(),
  confirmedScheduleVersion: z.number().nullable(),
  customerLink: z
    .object({
      linkId: z.number(),
      issuedAt: z.iso.datetime({ offset: true }),
      expiresAt: z.iso.datetime({ offset: true }),
      revokedAt: z.iso.datetime({ offset: true }).nullable(),
      responseVersion: z.number(),
    })
    .nullable(),
  rescheduleAlert: z
    .object({
      triggerType: z.enum(["SCHEDULE_CHANGED", "ACCESS_REVOKED", "OCCUPANT_CHANGED"]),
      reason: z.string().nullable(),
      raisedAt: z.iso.datetime({ offset: true }),
      approvalId: z.number().nullable(),
    })
    .nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
  officeId: z.number(),
});
export type VisitManagerUpdateResponse = z.infer<typeof VisitManagerUpdateResponseSchema>;

export const ApproverPropertyLinkIssueResponseSchema = z.object({
  linkId: z.number(),
  approvalId: z.number(),
  approvalRole: z.enum(["PRIMARY", "CO_APPROVER"]),
  token: z.string(),
  publicUrl: z.string(),
  issuedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type ApproverPropertyLinkIssueResponse = z.infer<
  typeof ApproverPropertyLinkIssueResponseSchema
>;

export const ApproverPropertyLinkStatusResponseSchema = z.object({
  hasActiveLink: z.boolean(),
  linkId: z.number().nullable().optional(),
  approvalRole: z.enum(["PRIMARY", "CO_APPROVER"]),
  issuedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  lastAccessedAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type ApproverPropertyLinkStatusResponse = z.infer<
  typeof ApproverPropertyLinkStatusResponseSchema
>;

export const ApproverPropertyLinkDeleteResponseSchema = z.object({});
export type ApproverPropertyLinkDeleteResponse = z.infer<
  typeof ApproverPropertyLinkDeleteResponseSchema
>;

export const ApproverConditionHistoryResponseSchema = z.object({ items: z.array(z.unknown()) });
export type ApproverConditionHistoryResponse = z.infer<
  typeof ApproverConditionHistoryResponseSchema
>;

export const VisitRequestCreateRequestSchema = z.object({
  candidatePropertyId: z.number(),
  requestedStartAt: z.iso.datetime({ offset: true }),
  requestedEndAt: z.iso.datetime({ offset: true }),
  expectedDurationMinutes: z.number(),
  partySize: z.number().nullable().optional(),
  requestNote: z.string().nullable().optional(),
});
export type VisitRequestCreateRequest = z.infer<typeof VisitRequestCreateRequestSchema>;

export const VisitRequestResponseSchema = z.object({
  requestId: z.number(),
  conditionId: z.number(),
  approvalId: z.number(),
  propertyId: z.number(),
  propertyOfficeId: z.number(),
  crossOffice: z.boolean(),
  accessGrantId: z.number().nullable().optional(),
  applicantOfficeId: z.number(),
  applicantMembershipId: z.number(),
  coordinationId: z.number(),
  candidatePropertyId: z.number(),
  requestKind: z.enum(["NEW", "CHANGE"]),
  replacesScheduleItemId: z.number().nullable().optional(),
  requestedStartAt: z.iso.datetime({ offset: true }),
  requestedEndAt: z.iso.datetime({ offset: true }),
  expectedDurationMinutes: z.number(),
  partySize: z.number().nullable().optional(),
  requestNote: z.string().nullable().optional(),
  status: z.string(),
  statusReason: z.string().nullable().optional(),
  submittedAt: z.iso.datetime({ offset: true }),
  closedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type VisitRequestResponse = z.infer<typeof VisitRequestResponseSchema>;

export const VisitRequestListResponseSchema = z.object({
  items: z.array(
    z.object({
      requestId: z.number(),
      propertyId: z.number(),
      propertyOfficeId: z.number(),
      crossOffice: z.boolean(),
      accessGrantId: z.number().nullable().optional(),
      candidatePropertyId: z.number(),
      status: z.string(),
      requestedStartAt: z.iso.datetime({ offset: true }),
      requestedEndAt: z.iso.datetime({ offset: true }),
      submittedAt: z.iso.datetime({ offset: true }),
      closedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      statusReason: z.string().nullable().optional(),
    }),
  ),
});
export type VisitRequestListResponse = z.infer<typeof VisitRequestListResponseSchema>;

export const VisitRequestDetailResponseSchema = z.object({
  propertyOfficeId: z.number(),
  crossOffice: z.boolean(),
  accessGrantId: z.number().nullable().optional(),
  statusHistory: z.array(
    z.object({
      fromStatus: z.string().nullable().optional(),
      toStatus: z.string(),
      source: z.enum(["BROKER", "APPROVER", "SYSTEM"]),
      reason: z.string().nullable().optional(),
      effectiveAt: z.iso.datetime({ offset: true }),
    }),
  ),
  selections: z.array(
    z.object({
      selectionId: z.number(),
      comparedRequestCount: z.number(),
      selectedAt: z.iso.datetime({ offset: true }),
    }),
  ),
  revalidations: z.array(
    z.object({
      revalidationId: z.number(),
      selectionId: z.number().nullable().optional(),
      conditionId: z.number(),
      result: z.enum(["PASSED", "FAILED"]),
      failureCode: z.string().nullable().optional(),
      failureDetail: z.string().nullable().optional(),
      checkedAt: z.iso.datetime({ offset: true }),
    }),
  ),
});
export type VisitRequestDetailResponse = z.infer<typeof VisitRequestDetailResponseSchema>;

export const VisitRequestWithdrawRequestSchema = z.object({
  reason: z.string().nullable().optional(),
});
export type VisitRequestWithdrawRequest = z.infer<typeof VisitRequestWithdrawRequestSchema>;

export const VisitRequestNoticeListResponseSchema = z.object({
  items: z.array(
    z.object({
      noticeId: z.number(),
      requestId: z.number(),
      noticeType: z.string(),
      channel: z.string().nullable().optional(),
      createdAt: z.iso.datetime({ offset: true }),
      readAt: z.iso.datetime({ offset: true }).nullable().optional(),
    }),
  ),
});
export type VisitRequestNoticeListResponse = z.infer<typeof VisitRequestNoticeListResponseSchema>;

export const VisitRequestNoticeReadResponseSchema = z.object({});
export type VisitRequestNoticeReadResponse = z.infer<typeof VisitRequestNoticeReadResponseSchema>;

export const VisitChangeRequestCreateRequestSchema = z.object({
  requestedStartAt: z.iso.datetime({ offset: true }),
  requestedEndAt: z.iso.datetime({ offset: true }),
  expectedDurationMinutes: z.number(),
  partySize: z.number().nullable().optional(),
  requestNote: z.string().nullable().optional(),
});
export type VisitChangeRequestCreateRequest = z.infer<typeof VisitChangeRequestCreateRequestSchema>;
