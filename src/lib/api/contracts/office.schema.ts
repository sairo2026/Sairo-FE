// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const OfficeChangeRequestCreateRequestSchema = z.object({
  changeType: z.enum(["ADDRESS", "REGISTRATION_INFO", "REPRESENTATIVE"]),
  requestedValues: z.record(z.string(), z.unknown()),
});
export type OfficeChangeRequestCreateRequest = z.infer<
  typeof OfficeChangeRequestCreateRequestSchema
>;

export const OfficeChangeRequestResponseSchema = z.object({
  requestId: z.number(),
  officeId: z.number(),
  changeType: z.enum(["ADDRESS", "REGISTRATION_INFO", "REPRESENTATIVE"]),
  requestedValues: z.object({
    address: z.string().optional(),
    registrationAuthority: z.string().optional(),
    realEstateLicenseNumber: z.string().optional(),
    businessRegistrationNumber: z.string().optional(),
    entityType: z.enum(["INDIVIDUAL", "CORPORATION"]).optional(),
    representativeName: z.string().optional(),
    representativePhone: z.string().optional(),
  }),
  status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OfficeChangeRequestResponse = z.infer<typeof OfficeChangeRequestResponseSchema>;

export const OfficeRegistrationCreateRequestSchema = z.object({
  entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
  registrationAuthority: z.string(),
  realEstateLicenseNumber: z.string(),
  businessRegistrationNumber: z.string(),
  requestedOfficeName: z.string(),
  requestedRepresentativeName: z.string(),
  requestedRepresentativePhone: z.string(),
  requestedAddress: z.string(),
  applicantRegistrationRelation: z.string(),
});
export type OfficeRegistrationCreateRequest = z.infer<typeof OfficeRegistrationCreateRequestSchema>;

export const OfficeRegistrationCreateResponseSchema = z.object({
  registrationId: z.number(),
  status: z.string(),
  currentRevisionNo: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  warning: z.string().optional(),
});
export type OfficeRegistrationCreateResponse = z.infer<
  typeof OfficeRegistrationCreateResponseSchema
>;

export const OfficeRegistrationStatusResponseSchema = z.object({
  registrationId: z.number(),
  status: z.enum([
    "DRAFT",
    "PENDING_REVIEW",
    "SUPPLEMENT_REQUESTED",
    "APPROVED",
    "REJECTED",
    "REVOKED",
    "CANCELLED",
  ]),
  currentRevisionNo: z.number(),
  entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
  supplementReason: z.string().nullable().optional(),
  supplementDueAt: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  revocationReason: z.string().nullable().optional(),
  revokedAt: z.string().nullable().optional(),
  resolved: z.boolean().nullable().optional(),
});
export type OfficeRegistrationStatusResponse = z.infer<
  typeof OfficeRegistrationStatusResponseSchema
>;

export const OfficeRegistrationCancelRequestSchema = z.object({
  reason: z.string().nullable().optional(),
});
export type OfficeRegistrationCancelRequest = z.infer<typeof OfficeRegistrationCancelRequestSchema>;

export const OfficeRegistrationCancelResponseSchema = z.object({
  registrationId: z.number(),
  status: z.string(),
  cancelledAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OfficeRegistrationCancelResponse = z.infer<
  typeof OfficeRegistrationCancelResponseSchema
>;

export const EvidenceSubmitRequestSchema = z.object({
  evidenceType: z.string(),
  file: z.unknown(),
});
export type EvidenceSubmitRequest = z.infer<typeof EvidenceSubmitRequestSchema>;

export const OfficeRegistrationEvidenceResponseSchema = z.object({
  registrationId: z.number(),
  status: z.string(),
  currentRevisionNo: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OfficeRegistrationEvidenceResponse = z.infer<
  typeof OfficeRegistrationEvidenceResponseSchema
>;

export const ReapplicationStartResponseSchema = z.object({
  registrationId: z.number(),
  resolved: z.boolean(),
});
export type ReapplicationStartResponse = z.infer<typeof ReapplicationStartResponseSchema>;

export const OfficeDetailResponseSchema = z.object({
  officeId: z.number(),
  name: z.string(),
  entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
  registrationAuthority: z.string(),
  realEstateLicenseNumber: z.string(),
  businessRegistrationNumber: z.string(),
  representativeName: z.string(),
  representativePhone: z.string().nullable(),
  address: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OfficeDetailResponse = z.infer<typeof OfficeDetailResponseSchema>;

export const OfficeUpdateRequestSchema = z.object({ representativePhone: z.string() });
export type OfficeUpdateRequest = z.infer<typeof OfficeUpdateRequestSchema>;

export const OfficeUpdateResponseSchema = z.object({
  officeId: z.number(),
  name: z.string(),
  entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
  registrationAuthority: z.string(),
  realEstateLicenseNumber: z.string(),
  businessRegistrationNumber: z.string(),
  representativeName: z.string(),
  representativePhone: z.string(),
  address: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OfficeUpdateResponse = z.infer<typeof OfficeUpdateResponseSchema>;

export const OfficeLookupRequestSchema = z.object({
  entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
  registrationAuthority: z.string(),
  realEstateLicenseNumber: z.string(),
});
export type OfficeLookupRequest = z.infer<typeof OfficeLookupRequestSchema>;

export const OfficeLookupResponseSchema = z.object({
  existingOfficeId: z.number().nullable().optional(),
});
export type OfficeLookupResponse = z.infer<typeof OfficeLookupResponseSchema>;

export const MembershipStatusResponseSchema = z.object({
  membershipId: z.number(),
  officeId: z.number(),
  officeName: z.string(),
  role: z.enum(["OWNER", "AGENT", "DEPUTY"]),
  status: z.enum([
    "APPROVED",
    "PENDING",
    "REJECTED",
    "REVOKED",
    "CANCELLED",
    "SUSPENDED",
    "EXPIRED",
  ]),
  requestSource: z.enum(["REQUEST", "INVITE", "REGISTRATION", "TRANSFER"]),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  invitationAcceptedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  resolved: z.boolean().nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type MembershipStatusResponse = z.infer<typeof MembershipStatusResponseSchema>;

export const MembershipSuspendRequestSchema = z.object({ reason: z.string() });
export type MembershipSuspendRequest = z.infer<typeof MembershipSuspendRequestSchema>;

export const MembershipRevokeResponseSchema = z.object({});
export type MembershipRevokeResponse = z.infer<typeof MembershipRevokeResponseSchema>;

export const MembershipInvitationAcceptRequestSchema = z.object({
  qualificationNumber: z.string().nullable().optional(),
  employmentReportConfirmed: z.boolean(),
  trainingConfirmed: z.boolean(),
});
export type MembershipInvitationAcceptRequest = z.infer<
  typeof MembershipInvitationAcceptRequestSchema
>;

export const MembershipInvitationAcceptResponseSchema = z.object({
  membershipId: z.number(),
  invitationAcceptedAt: z.string(),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type MembershipInvitationAcceptResponse = z.infer<
  typeof MembershipInvitationAcceptResponseSchema
>;

export const MembershipApproveResponseSchema = z.object({
  membershipId: z.number(),
  status: z.string(),
  role: z.enum(["AGENT", "DEPUTY"]),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type MembershipApproveResponse = z.infer<typeof MembershipApproveResponseSchema>;

export const MembershipCancelResponseSchema = z.object({
  membershipId: z.number(),
  status: z.string(),
  role: z.enum(["AGENT", "DEPUTY"]),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type MembershipCancelResponse = z.infer<typeof MembershipCancelResponseSchema>;

export const MembershipReapplicationStartResponseSchema = z.object({
  membershipId: z.number(),
  status: z.string(),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type MembershipReapplicationStartResponse = z.infer<
  typeof MembershipReapplicationStartResponseSchema
>;

export const MembershipReinstateResponseSchema = z.object({
  membershipId: z.number(),
  status: z.string(),
  role: z.enum(["AGENT", "DEPUTY"]),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type MembershipReinstateResponse = z.infer<typeof MembershipReinstateResponseSchema>;

export const MembershipDecisionRequestSchema = z.object({
  reason: z.string().nullable().optional(),
});
export type MembershipDecisionRequest = z.infer<typeof MembershipDecisionRequestSchema>;

export const MembershipRejectResponseSchema = z.object({
  membershipId: z.number(),
  status: z.string(),
  role: z.enum(["AGENT", "DEPUTY"]),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type MembershipRejectResponse = z.infer<typeof MembershipRejectResponseSchema>;

export const MembershipRoleUpdateRequestSchema = z.object({ role: z.enum(["AGENT", "DEPUTY"]) });
export type MembershipRoleUpdateRequest = z.infer<typeof MembershipRoleUpdateRequestSchema>;

export const MembershipRoleUpdateResponseSchema = z.object({
  membershipId: z.number(),
  role: z.enum(["AGENT", "DEPUTY"]),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type MembershipRoleUpdateResponse = z.infer<typeof MembershipRoleUpdateResponseSchema>;

export const MembershipSuspendResponseSchema = z.object({
  membershipId: z.number(),
  status: z.string(),
  role: z.enum(["AGENT", "DEPUTY"]),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type MembershipSuspendResponse = z.infer<typeof MembershipSuspendResponseSchema>;

export const EmploymentRosterListResponseSchema = z.object({
  quota: z.object({
    qualifiedCount: z.number(),
    deputyCount: z.number(),
    deputyLimit: z.number(),
    exceeded: z.boolean(),
  }),
  items: z.array(
    z.object({
      rosterId: z.number(),
      officeId: z.number(),
      membershipId: z.number().nullable(),
      personName: z.string(),
      legalQualification: z.enum(["AGENT", "DEPUTY"]),
      employmentStartDate: z.string(),
      employmentEndDate: z.string().nullable(),
      confirmationSource: z.enum(["REGISTRATION_DOC", "MANUAL_ENTRY"]),
      createdAt: z.string(),
      updatedAt: z.string(),
      version: z.number(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type EmploymentRosterListResponse = z.infer<typeof EmploymentRosterListResponseSchema>;

export const EmploymentRosterCreateRequestSchema = z.object({
  personName: z.string(),
  legalQualification: z.enum(["AGENT", "DEPUTY"]),
  employmentStartDate: z.iso.date(),
  confirmationSource: z.enum(["REGISTRATION_DOC", "MANUAL_ENTRY"]),
  membershipId: z.number().nullable().optional(),
});
export type EmploymentRosterCreateRequest = z.infer<typeof EmploymentRosterCreateRequestSchema>;

export const EmploymentRosterCreateResponseSchema = z.object({
  rosterId: z.number(),
  officeId: z.number(),
  membershipId: z.number().nullable(),
  personName: z.string(),
  legalQualification: z.enum(["AGENT", "DEPUTY"]),
  employmentStartDate: z.string(),
  employmentEndDate: z.string().nullable(),
  confirmationSource: z.enum(["REGISTRATION_DOC", "MANUAL_ENTRY"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type EmploymentRosterCreateResponse = z.infer<typeof EmploymentRosterCreateResponseSchema>;

export const EmploymentRosterUpdateRequestSchema = z.object({
  employmentEndDate: z.iso.date().nullable().optional(),
  legalQualification: z.enum(["AGENT", "DEPUTY"]).optional(),
});
export type EmploymentRosterUpdateRequest = z.infer<typeof EmploymentRosterUpdateRequestSchema>;

export const EmploymentRosterUpdateResponseSchema = z.object({
  rosterId: z.number(),
  officeId: z.number(),
  membershipId: z.number().nullable(),
  personName: z.string(),
  legalQualification: z.enum(["AGENT", "DEPUTY"]),
  employmentStartDate: z.string(),
  employmentEndDate: z.string().nullable(),
  confirmationSource: z.enum(["REGISTRATION_DOC", "MANUAL_ENTRY"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  warning: z.string().optional(),
});
export type EmploymentRosterUpdateResponse = z.infer<typeof EmploymentRosterUpdateResponseSchema>;

export const OfficeMembershipListResponseSchema = z.object({
  items: z.array(
    z.object({
      membershipId: z.number(),
      userId: z.number().nullable(),
      displayName: z.string(),
      role: z.enum(["OWNER", "AGENT", "DEPUTY"]),
      status: z.enum(["APPROVED", "PENDING", "SUSPENDED"]),
      approvedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      requestSource: z
        .enum(["REQUEST", "INVITE", "REGISTRATION", "TRANSFER"])
        .nullable()
        .optional(),
      expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
      invitationAcceptedAt: z.iso.datetime({ offset: true }).nullable().optional(),
      qualificationNumber: z.string().nullable().optional(),
      employmentReportConfirmed: z.boolean().nullable().optional(),
      trainingConfirmed: z.boolean().nullable().optional(),
      billable: z.boolean().nullable().optional(),
      officeId: z.number().nullable(),
      createdAt: z.iso.datetime({ offset: true }).nullable(),
      updatedAt: z.iso.datetime({ offset: true }).nullable(),
      version: z.number().nullable(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OfficeMembershipListResponse = z.infer<typeof OfficeMembershipListResponseSchema>;

export const MembershipInviteRequestSchema = z.object({
  email: z.string(),
  role: z.enum(["AGENT", "DEPUTY"]),
});
export type MembershipInviteRequest = z.infer<typeof MembershipInviteRequestSchema>;

export const MembershipInvitationResponseSchema = z.object({
  membershipId: z.number(),
  status: z.string(),
  role: z.enum(["AGENT", "DEPUTY"]),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  expiresAt: z.string(),
});
export type MembershipInvitationResponse = z.infer<typeof MembershipInvitationResponseSchema>;

export const OwnerTransferCreateRequestSchema = z.object({ toUserId: z.number() });
export type OwnerTransferCreateRequest = z.infer<typeof OwnerTransferCreateRequestSchema>;

export const OwnerTransferCreateResponseSchema = z.object({
  transferId: z.number(),
  officeId: z.number(),
  status: z.string(),
  requestedAt: z.string(),
  acceptDeadlineAt: z.string(),
  acceptedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  withdrawnAt: z.string().nullable(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OwnerTransferCreateResponse = z.infer<typeof OwnerTransferCreateResponseSchema>;

export const OfficeSearchRequestSchema = z.object({
  businessRegistrationNumber: z.string().optional(),
  name: z.string().optional(),
  region: z.string().optional(),
  page: z.number().optional(),
  size: z.number().optional(),
});
export type OfficeSearchRequest = z.infer<typeof OfficeSearchRequestSchema>;

export const OfficeSearchResponseSchema = z.object({
  items: z.array(
    z.object({
      officeId: z.number(),
      name: z.string(),
      entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
      registrationAuthority: z.string(),
      realEstateLicenseNumber: z.string(),
      address: z.string(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OfficeSearchResponse = z.infer<typeof OfficeSearchResponseSchema>;

export const MembershipCreateRequestSchema = z.object({
  role: z.string().optional(),
  qualificationNumber: z.string().nullable().optional(),
  employmentReportConfirmed: z.boolean(),
  trainingConfirmed: z.boolean(),
});
export type MembershipCreateRequest = z.infer<typeof MembershipCreateRequestSchema>;

export const MembershipCreateResponseSchema = z.object({
  membershipId: z.number(),
  status: z.string(),
  role: z.enum(["AGENT", "DEPUTY"]),
  officeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
export type MembershipCreateResponse = z.infer<typeof MembershipCreateResponseSchema>;

export const OwnerTransferStatusResponseSchema = z.object({
  transferId: z.number(),
  officeId: z.number(),
  fromDisplayName: z.string(),
  toDisplayName: z.string(),
  status: z.enum(["PENDING", "UNDER_REVIEW", "COMPLETED", "REJECTED", "WITHDRAWN", "EXPIRED"]),
  rejectionReason: z.string().nullable().optional(),
  rejectedAt: z.string().nullable().optional(),
  requestedAt: z.string(),
  acceptDeadlineAt: z.string(),
  acceptedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  withdrawnAt: z.string().nullable(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OwnerTransferStatusResponse = z.infer<typeof OwnerTransferStatusResponseSchema>;

export const OwnerTransferAcceptResponseSchema = z.object({
  transferId: z.number(),
  status: z.string(),
});
export type OwnerTransferAcceptResponse = z.infer<typeof OwnerTransferAcceptResponseSchema>;

export const OwnerTransferWithdrawResponseSchema = z.object({
  transferId: z.number(),
  officeId: z.number(),
  status: z.string(),
  requestedAt: z.string(),
  acceptDeadlineAt: z.string(),
  acceptedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  withdrawnAt: z.string().nullable(),
  updatedAt: z.string(),
  version: z.number(),
});
export type OwnerTransferWithdrawResponse = z.infer<typeof OwnerTransferWithdrawResponseSchema>;

export const OfficeChangeRequestListRequestSchema = z.object({
  status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED"]).optional(),
  page: z.number().optional(),
  size: z.number().optional(),
});
export type OfficeChangeRequestListRequest = z.infer<typeof OfficeChangeRequestListRequestSchema>;

export const OfficeChangeRequestListResponseSchema = z.object({
  items: z.array(
    z.object({
      requestId: z.number(),
      changeType: z.enum(["ADDRESS", "REGISTRATION_INFO", "REPRESENTATIVE"]),
      requestedValues: z.record(z.string(), z.unknown()),
      status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED"]),
      rejectionReason: z.string().nullable().optional(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type OfficeChangeRequestListResponse = z.infer<typeof OfficeChangeRequestListResponseSchema>;

export const OwnerTransferCurrentResponseSchema = z.object({
  transferId: z.number(),
  officeId: z.number(),
  fromDisplayName: z.string(),
  toDisplayName: z.string(),
  status: z.enum(["PENDING", "UNDER_REVIEW"]),
  requestedAt: z.iso.datetime({ offset: true }),
  acceptDeadlineAt: z.iso.datetime({ offset: true }),
  acceptedAt: z.iso.datetime({ offset: true }).nullable(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type OwnerTransferCurrentResponse = z.infer<typeof OwnerTransferCurrentResponseSchema>;

export const OwnerTransferRejectRequestSchema = z.object({
  reason: z.string().nullable().optional(),
});
export type OwnerTransferRejectRequest = z.infer<typeof OwnerTransferRejectRequestSchema>;

export const OwnerTransferRejectResponseSchema = z.object({
  transferId: z.number(),
  status: z.string(),
  rejectedAt: z.iso.datetime({ offset: true }),
});
export type OwnerTransferRejectResponse = z.infer<typeof OwnerTransferRejectResponseSchema>;

export const MembershipDetailResponseSchema = z.object({
  membershipId: z.number(),
  officeId: z.number(),
  userId: z.number(),
  displayName: z.string(),
  role: z.enum(["OWNER", "AGENT", "DEPUTY"]),
  status: z.enum([
    "APPROVED",
    "PENDING",
    "SUSPENDED",
    "REJECTED",
    "REVOKED",
    "CANCELLED",
    "EXPIRED",
  ]),
  requestSource: z.enum(["REQUEST", "INVITE", "REGISTRATION", "TRANSFER"]),
  qualificationNumber: z.string().nullable().optional(),
  employmentReportConfirmed: z.boolean().nullable().optional(),
  trainingConfirmed: z.boolean().nullable().optional(),
  billable: z.boolean(),
  approvedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  assignedCounts: z.object({
    customers: z.number(),
    properties: z.number(),
    tasks: z.number(),
    contracts: z.number(),
    confirmedVisits: z.number(),
  }),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type MembershipDetailResponse = z.infer<typeof MembershipDetailResponseSchema>;

export const MembershipInvitationCancelResponseSchema = z.object({
  membershipId: z.number(),
  status: z.string(),
  role: z.enum(["AGENT", "DEPUTY"]),
  officeId: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type MembershipInvitationCancelResponse = z.infer<
  typeof MembershipInvitationCancelResponseSchema
>;

export const MembershipInvitationResendResponseSchema = z.object({
  membershipId: z.number(),
  status: z.string(),
  expiresAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number(),
});
export type MembershipInvitationResendResponse = z.infer<
  typeof MembershipInvitationResendResponseSchema
>;

export const MembershipLeaveResponseSchema = z.object({});
export type MembershipLeaveResponse = z.infer<typeof MembershipLeaveResponseSchema>;
