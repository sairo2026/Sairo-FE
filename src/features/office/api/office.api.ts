import { z } from "zod";
import {
  EmploymentRosterCreateResponseSchema,
  EmploymentRosterListResponseSchema,
  EmploymentRosterUpdateResponseSchema,
  MembershipApproveResponseSchema,
  MembershipCancelResponseSchema,
  MembershipCreateResponseSchema,
  MembershipDetailResponseSchema,
  MembershipInvitationAcceptResponseSchema,
  MembershipInvitationCancelResponseSchema,
  MembershipInvitationResendResponseSchema,
  MembershipInvitationResponseSchema,
  MembershipReapplicationStartResponseSchema,
  MembershipRejectResponseSchema,
  MembershipReinstateResponseSchema,
  MembershipRoleUpdateResponseSchema,
  MembershipStatusResponseSchema,
  MembershipSuspendResponseSchema,
  OfficeChangeRequestListResponseSchema,
  OfficeChangeRequestResponseSchema,
  OfficeDetailResponseSchema,
  OfficeLookupResponseSchema,
  OfficeMembershipListResponseSchema,
  OfficeRegistrationCancelResponseSchema,
  OfficeRegistrationCreateResponseSchema,
  OfficeRegistrationEvidenceResponseSchema,
  OfficeRegistrationStatusResponseSchema,
  OfficeSearchResponseSchema,
  OfficeUpdateResponseSchema,
  OwnerTransferAcceptResponseSchema,
  OwnerTransferCreateResponseSchema,
  OwnerTransferCurrentResponseSchema,
  OwnerTransferRejectResponseSchema,
  OwnerTransferStatusResponseSchema,
  OwnerTransferWithdrawResponseSchema,
  ReapplicationStartResponseSchema,
} from "@/lib/api/contracts/office.schema";
import type {
  EmploymentRosterCreateRequest,
  EmploymentRosterUpdateRequest,
  MembershipCreateRequest,
  MembershipInvitationAcceptRequest,
  MembershipInviteRequest,
  OfficeChangeRequestCreateRequest,
  OfficeLookupRequest,
  OfficeRegistrationCreateRequest,
} from "@/lib/api/contracts/office.schema";
import { ApiError, apiFetch, withQuery } from "@/shared/api/client";

/** 명세 6장 상세 응답이 허용하는 참여 경로 네 가지. 대표 본인 행은 REGISTRATION 또는 TRANSFER로 온다. */
const REQUEST_SOURCES = ["REQUEST", "INVITE", "REGISTRATION", "TRANSFER"] as const;

export const MembershipStatusWireSchema = MembershipStatusResponseSchema.extend({
  requestSource: z.enum(REQUEST_SOURCES),
});
export type MembershipStatusWire = z.infer<typeof MembershipStatusWireSchema>;

/** 명세 6장은 대표가 아닌 호출자에게 소속 메타 정보를 null로 준다고 적는다. */
const MembershipListItemWireSchema = OfficeMembershipListResponseSchema.shape.items.element.extend({
  requestSource: z.enum(REQUEST_SOURCES).nullable().optional(),
  officeId: z.number().nullable(),
  createdAt: z.iso.datetime({ offset: true }).nullable(),
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
  version: z.number().nullable(),
});
export const OfficeMembershipListWireSchema = OfficeMembershipListResponseSchema.extend({
  items: z.array(MembershipListItemWireSchema),
});
export type OfficeMembershipListWire = z.infer<typeof OfficeMembershipListWireSchema>;

function ifMatch(version: number) {
  return { "If-Match": String(version) };
}

async function nullOn404<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function lookupOffice(request: OfficeLookupRequest) {
  return apiFetch(withQuery("/api/offices/lookup", { ...request }), {
    schema: OfficeLookupResponseSchema,
  });
}

export function createRegistration(request: OfficeRegistrationCreateRequest) {
  return apiFetch("/api/office-registrations", {
    method: "POST",
    body: request,
    schema: OfficeRegistrationCreateResponseSchema,
  });
}

export function submitEvidence(registrationId: number, form: FormData) {
  return apiFetch(`/api/office-registrations/${registrationId}/evidence`, {
    method: "POST",
    body: form,
    timeoutMs: 60_000,
    schema: OfficeRegistrationEvidenceResponseSchema,
  });
}

export function fetchLatestRegistration() {
  return nullOn404(
    apiFetch("/api/office-registrations/me", { schema: OfficeRegistrationStatusResponseSchema }),
  );
}

export function cancelRegistration(registrationId: number, reason?: string) {
  return apiFetch(`/api/office-registrations/${registrationId}/cancel`, {
    method: "POST",
    body: reason ? { reason } : {},
    schema: OfficeRegistrationCancelResponseSchema,
  });
}

export function startReapplication(registrationId: number) {
  return apiFetch(`/api/office-registrations/${registrationId}/reapplication-start`, {
    method: "POST",
    schema: ReapplicationStartResponseSchema,
  });
}

export function fetchCurrentOffice() {
  return apiFetch("/api/offices/current", { schema: OfficeDetailResponseSchema });
}

export function updateOfficePhone(representativePhone: string, version: number) {
  return apiFetch("/api/offices/current", {
    method: "PATCH",
    body: { representativePhone },
    headers: ifMatch(version),
    schema: OfficeUpdateResponseSchema,
  });
}

export function createChangeRequest(request: OfficeChangeRequestCreateRequest) {
  return apiFetch("/api/office-change-requests", {
    method: "POST",
    body: request,
    schema: OfficeChangeRequestResponseSchema,
  });
}

export function listChangeRequests(page: number, size: number) {
  return apiFetch(withQuery("/api/office-change-requests", { page, size }), {
    schema: OfficeChangeRequestListResponseSchema,
  });
}

export type OfficeSearchParams = {
  businessRegistrationNumber?: string;
  name?: string;
  region?: string;
  page: number;
  size: number;
};

export function searchOffices(params: OfficeSearchParams) {
  return apiFetch(withQuery("/api/offices/search", { ...params }), {
    schema: OfficeSearchResponseSchema,
  });
}

export function createMembership(officeId: number, request: MembershipCreateRequest) {
  return apiFetch(`/api/offices/${officeId}/memberships`, {
    method: "POST",
    body: request,
    schema: MembershipCreateResponseSchema,
  });
}

export function fetchMyMembership() {
  return nullOn404(apiFetch("/api/memberships/me", { schema: MembershipStatusWireSchema }));
}

export function cancelMembership(membershipId: number) {
  return apiFetch(`/api/memberships/${membershipId}/cancel`, {
    method: "POST",
    schema: MembershipCancelResponseSchema,
  });
}

export function startMembershipReapplication(
  membershipId: number,
  request: MembershipCreateRequest,
) {
  return apiFetch(`/api/memberships/${membershipId}/reapplication-start`, {
    method: "POST",
    body: request,
    schema: MembershipReapplicationStartResponseSchema,
  });
}

export function acceptInvitation(membershipId: number, request: MembershipInvitationAcceptRequest) {
  return apiFetch(`/api/memberships/${membershipId}/accept-invitation`, {
    method: "POST",
    body: request,
    schema: MembershipInvitationAcceptResponseSchema,
  });
}

export type MembershipListParams = {
  status?: "APPROVED" | "PENDING" | "SUSPENDED";
  page: number;
  size: number;
};

export function listMemberships(params: MembershipListParams) {
  return apiFetch(withQuery("/api/offices/current/memberships", { ...params }), {
    schema: OfficeMembershipListWireSchema,
  });
}

export function fetchMembershipDetail(membershipId: number) {
  return apiFetch(`/api/memberships/${membershipId}`, { schema: MembershipDetailResponseSchema });
}

export function approveMembership(membershipId: number) {
  return apiFetch(`/api/memberships/${membershipId}/approve`, {
    method: "POST",
    schema: MembershipApproveResponseSchema,
  });
}

export function rejectMembership(membershipId: number, reason: string) {
  return apiFetch(`/api/memberships/${membershipId}/reject`, {
    method: "POST",
    body: { reason },
    schema: MembershipRejectResponseSchema,
  });
}

export function updateMembershipRole(
  membershipId: number,
  role: "AGENT" | "DEPUTY",
  version: number,
) {
  return apiFetch(`/api/memberships/${membershipId}/role`, {
    method: "PATCH",
    body: { role },
    headers: ifMatch(version),
    schema: MembershipRoleUpdateResponseSchema,
  });
}

export function suspendMembership(membershipId: number, reason: string) {
  return apiFetch(`/api/memberships/${membershipId}/suspend`, {
    method: "POST",
    body: { reason },
    schema: MembershipSuspendResponseSchema,
  });
}

export function reinstateMembership(membershipId: number) {
  return apiFetch(`/api/memberships/${membershipId}/reinstate`, {
    method: "POST",
    schema: MembershipReinstateResponseSchema,
  });
}

export function revokeMembership(membershipId: number, reason: string) {
  return apiFetch(`/api/memberships/${membershipId}`, {
    method: "DELETE",
    body: { reason },
    schema: z.unknown(),
  });
}

export function inviteMember(request: MembershipInviteRequest) {
  return apiFetch("/api/offices/current/memberships/invite", {
    method: "POST",
    body: request,
    schema: MembershipInvitationResponseSchema,
  });
}

export function cancelInvitation(membershipId: number) {
  return apiFetch(`/api/memberships/${membershipId}/invitation/cancel`, {
    method: "POST",
    schema: MembershipInvitationCancelResponseSchema,
  });
}

export function resendInvitation(membershipId: number) {
  return apiFetch(`/api/memberships/${membershipId}/invitation/resend`, {
    method: "POST",
    schema: MembershipInvitationResendResponseSchema,
  });
}

export function listRoster(page: number, size: number) {
  return apiFetch(withQuery("/api/offices/current/employment-roster", { page, size }), {
    schema: EmploymentRosterListResponseSchema,
  });
}

export function createRosterItem(request: EmploymentRosterCreateRequest) {
  return apiFetch("/api/offices/current/employment-roster", {
    method: "POST",
    body: request,
    schema: EmploymentRosterCreateResponseSchema,
  });
}

export function updateRosterItem(
  rosterId: number,
  request: EmploymentRosterUpdateRequest,
  version: number,
) {
  return apiFetch(`/api/offices/current/employment-roster/${rosterId}`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(version),
    schema: EmploymentRosterUpdateResponseSchema,
  });
}

export function fetchCurrentTransfer() {
  return nullOn404(
    apiFetch("/api/offices/current/owner-transfer", {
      schema: OwnerTransferCurrentResponseSchema,
    }),
  );
}

export function fetchTransfer(transferId: number) {
  return apiFetch(`/api/owner-transfers/${transferId}`, {
    schema: OwnerTransferStatusResponseSchema,
  });
}

export function createTransfer(toUserId: number) {
  return apiFetch("/api/offices/current/owner-transfer", {
    method: "POST",
    body: { toUserId },
    schema: OwnerTransferCreateResponseSchema,
  });
}

export function acceptTransfer(transferId: number) {
  return apiFetch(`/api/owner-transfers/${transferId}/accept`, {
    method: "POST",
    schema: OwnerTransferAcceptResponseSchema,
  });
}

export function rejectTransfer(transferId: number, reason?: string) {
  return apiFetch(`/api/owner-transfers/${transferId}/reject`, {
    method: "POST",
    body: reason ? { reason } : {},
    schema: OwnerTransferRejectResponseSchema,
  });
}

export function withdrawTransfer(transferId: number) {
  return apiFetch(`/api/owner-transfers/${transferId}/withdraw`, {
    method: "POST",
    schema: OwnerTransferWithdrawResponseSchema,
  });
}
