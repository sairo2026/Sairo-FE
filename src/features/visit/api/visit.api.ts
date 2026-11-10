import { CustomerAssistantViewResponseSchema } from "@/lib/api/contracts/customer.schema";
import {
  AccessApprovalHistoryResponseSchema,
  AccessApprovalResponseSchema,
  ApproverPropertyLinkIssueResponseSchema,
  ApproverPropertyLinkStatusResponseSchema,
  CandidatePropertyAddResponseSchema,
  CustomerLinkIssueResponseSchema,
  CustomerLinkReissueResponseSchema,
  ReceivedApplyGrantListResponseSchema,
  ScheduleConflictCheckResponseSchema,
  VisitCoordinationCreateResponseSchema,
  VisitCoordinationDetailResponseSchema,
  VisitCoordinationListResponseSchema,
  VisitManagerUpdateResponseSchema,
  VisitScheduleUpdateResponseSchema,
} from "@/lib/api/contracts/visit.schema";
import type {
  CandidatePropertyAddRequest,
  PropertyAccessApprovalCreateRequest,
  VisitCoordinationCreateRequest,
  VisitCoordinationManagerChangeRequest,
  VisitScheduleUpdateRequest,
} from "@/lib/api/contracts/visit.schema";
import { apiFetch, withQuery } from "@/shared/api/client";

function ifMatch(version: number) {
  return { "If-Match": String(version) };
}

export type VisitListParams = { status?: string; page: number; size: number };

export function listCoordinations(params: VisitListParams) {
  return apiFetch(withQuery("/api/visit-coordinations", { ...params }), {
    schema: VisitCoordinationListResponseSchema,
  });
}

export function createCoordination(request: VisitCoordinationCreateRequest) {
  return apiFetch("/api/visit-coordinations", {
    method: "POST",
    body: request,
    schema: VisitCoordinationCreateResponseSchema,
  });
}

export function fetchCoordination(coordinationId: number) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}`, {
    schema: VisitCoordinationDetailResponseSchema,
  });
}

export function addCandidate(coordinationId: number, request: CandidatePropertyAddRequest) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/candidate-properties`, {
    method: "POST",
    body: request,
    schema: CandidatePropertyAddResponseSchema,
  });
}

export function removeCandidate(coordinationId: number, candidateId: number) {
  return apiFetch(
    `/api/visit-coordinations/${coordinationId}/candidate-properties/${candidateId}`,
    { method: "DELETE" },
  );
}

export function saveSchedule(
  coordinationId: number,
  request: VisitScheduleUpdateRequest,
  version: number,
) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/schedule`, {
    method: "PUT",
    body: request,
    headers: ifMatch(version),
    schema: VisitScheduleUpdateResponseSchema,
  });
}

export function checkScheduleConflicts(coordinationId: number) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/schedule/conflicts`, {
    schema: ScheduleConflictCheckResponseSchema,
  });
}

export function changeManager(
  coordinationId: number,
  request: VisitCoordinationManagerChangeRequest,
  version: number,
) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/manager`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(version),
    schema: VisitManagerUpdateResponseSchema,
  });
}

export function issueCustomerLink(coordinationId: number) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/customer-link`, {
    method: "POST",
    schema: CustomerLinkIssueResponseSchema,
  });
}

export function reissueCustomerLink(coordinationId: number) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/customer-link/reissue`, {
    method: "POST",
    schema: CustomerLinkReissueResponseSchema,
  });
}

export function fetchAssistantCustomer(customerId: number) {
  return apiFetch(`/api/customers/${customerId}/assistant-view`, {
    schema: CustomerAssistantViewResponseSchema,
  });
}

export function listReceivedGrants(params: { keyword?: string; page: number; size: number }) {
  return apiFetch(withQuery("/api/apply-grants/received", { ...params }), {
    schema: ReceivedApplyGrantListResponseSchema,
  });
}

export function listAccessApprovals(propertyId: number) {
  return apiFetch(`/api/properties/${propertyId}/access-approvals`, {
    schema: AccessApprovalHistoryResponseSchema,
  });
}

export function createAccessApproval(
  propertyId: number,
  request: PropertyAccessApprovalCreateRequest,
) {
  return apiFetch(`/api/properties/${propertyId}/access-approvals`, {
    method: "POST",
    body: request,
    schema: AccessApprovalResponseSchema,
  });
}

function propertyLinkPath(propertyId: number, approvalId: number) {
  return `/api/properties/${propertyId}/access-approvals/${approvalId}/approver-property-link`;
}

export function fetchApproverLinkStatus(propertyId: number, approvalId: number) {
  return apiFetch(propertyLinkPath(propertyId, approvalId), {
    schema: ApproverPropertyLinkStatusResponseSchema,
  });
}

export function issueApproverLink(propertyId: number, approvalId: number) {
  return apiFetch(propertyLinkPath(propertyId, approvalId), {
    method: "POST",
    schema: ApproverPropertyLinkIssueResponseSchema,
  });
}

export function revokeApproverLink(propertyId: number, approvalId: number) {
  return apiFetch(propertyLinkPath(propertyId, approvalId), { method: "DELETE" });
}
