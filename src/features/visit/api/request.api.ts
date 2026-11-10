import {
  ApplyGrantResponseSchema,
  CrossOfficeRequestListResponseSchema,
  CrossOfficeScheduleListResponseSchema,
  VisitCoordinationDetailResponseSchema,
  VisitRequestDetailResponseSchema,
  VisitRequestListResponseSchema,
  VisitRequestNoticeListResponseSchema,
  VisitRequestNoticeReadResponseSchema,
  VisitRequestResponseSchema,
} from "@/lib/api/contracts/visit.schema";
import type {
  ApplyGrantCreateRequest,
  ApplyGrantRevokeRequest,
  VisitChangeRequestCreateRequest,
  VisitRequestCreateRequest,
  VisitRequestWithdrawRequest,
} from "@/lib/api/contracts/visit.schema";
import { z } from "zod";
import { apiFetch, withQuery } from "@/shared/api/client";

const RequestListSchema = z.object({
  items: z.array(
    VisitRequestListResponseSchema.shape.items.element.extend({
      version: z.number().optional(),
      requestKind: z.string().optional(),
    }),
  ),
});
const GrantListSchema = z.object({
  items: z.array(ApplyGrantResponseSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});

const GrantRevokeSchema = z.object({
  grant: ApplyGrantResponseSchema,
  closedRequestIds: z.array(z.number()),
  keptScheduleItemIds: z.array(z.number()),
});

export type RequestListItem = z.infer<typeof RequestListSchema>["items"][number];

function ifMatch(version: number) {
  return { "If-Match": String(version) };
}

export function fetchCoordinationForChange(coordinationId: number, changeScheduleItemId: number) {
  return apiFetch(
    withQuery(`/api/visit-coordinations/${coordinationId}`, { changeScheduleItemId }),
    {
      schema: VisitCoordinationDetailResponseSchema,
    },
  );
}

export function createVisitRequest(coordinationId: number, request: VisitRequestCreateRequest) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/visit-requests`, {
    method: "POST",
    body: request,
    schema: VisitRequestResponseSchema,
  });
}

export function listVisitRequests(coordinationId: number) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/visit-requests`, {
    schema: RequestListSchema,
  });
}

export function fetchVisitRequest(requestId: number) {
  return apiFetch(`/api/visit-requests/${requestId}`, {
    schema: VisitRequestDetailResponseSchema,
  });
}

export function withdrawVisitRequest(
  requestId: number,
  version: number,
  request: VisitRequestWithdrawRequest = {},
) {
  return apiFetch(`/api/visit-requests/${requestId}/withdraw`, {
    method: "POST",
    body: request,
    headers: ifMatch(version),
    schema: VisitRequestResponseSchema,
  });
}

export function createChangeRequest(itemId: number, request: VisitChangeRequestCreateRequest) {
  return apiFetch(`/api/visit-schedule-items/${itemId}/change-requests`, {
    method: "POST",
    body: request,
    schema: VisitRequestResponseSchema,
  });
}

export function listRequestNotices() {
  return apiFetch("/api/visit-request-notices", { schema: VisitRequestNoticeListResponseSchema });
}

export function readRequestNotice(noticeId: number) {
  return apiFetch(`/api/visit-request-notices/${noticeId}/read`, {
    method: "POST",
    schema: VisitRequestNoticeReadResponseSchema,
  });
}

function grantsPath(propertyId: number, approvalId: number) {
  return `/api/properties/${propertyId}/access-approvals/${approvalId}/apply-grants`;
}

export function listApplyGrants(propertyId: number, approvalId: number) {
  return apiFetch(grantsPath(propertyId, approvalId), { schema: GrantListSchema });
}

export function createApplyGrant(
  propertyId: number,
  approvalId: number,
  request: ApplyGrantCreateRequest,
) {
  return apiFetch(grantsPath(propertyId, approvalId), {
    method: "POST",
    body: request,
    schema: ApplyGrantResponseSchema,
  });
}

export function revokeApplyGrant(
  propertyId: number,
  approvalId: number,
  grantId: number,
  request: ApplyGrantRevokeRequest,
) {
  return apiFetch(`${grantsPath(propertyId, approvalId)}/${grantId}/revoke`, {
    method: "POST",
    body: request,
    schema: GrantRevokeSchema,
  });
}

export type CrossOfficeParams = { status?: string; page: number; size: number };

export function listCrossOfficeRequests(propertyId: number, params: CrossOfficeParams) {
  return apiFetch(withQuery(`/api/properties/${propertyId}/cross-office-requests`, { ...params }), {
    schema: CrossOfficeRequestListResponseSchema,
  });
}

export function listCrossOfficeSchedules(propertyId: number, params: CrossOfficeParams) {
  return apiFetch(
    withQuery(`/api/properties/${propertyId}/cross-office-schedules`, { ...params }),
    { schema: CrossOfficeScheduleListResponseSchema },
  );
}
