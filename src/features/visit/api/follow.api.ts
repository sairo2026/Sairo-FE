import {
  AssistantNoticeConfirmResponseSchema,
  AssistantNoticeListResponseSchema,
  AssistantNoticeResponseSchema,
  AssistantNoticeSupervisionListResponseSchema,
  ConfirmationDeliveryListResponseSchema,
  ConfirmationDeliveryResponseSchema,
  ConfirmationMessagesResponseSchema,
  CustomerAvailableTimesResponseSchema,
  PublicConfirmedVisitResponseSchema,
  PublicVisitLinkResponseSchema,
  VisitAccessRevocationResponseSchema,
  VisitCoordinationCancelResponseSchema,
  VisitCoordinationCloneResponseSchema,
  VisitCoordinationRescheduleResponseSchema,
  VisitScheduleItemResultHistoryResponseSchema,
  VisitScheduleItemResultResponseSchema,
} from "@/lib/api/contracts/visit.schema";
import type {
  AssistantNoticeCreateRequest,
  AvailableTimesSubmitRequest,
  ConfirmationDeliveryCreateRequest,
  StaffAccessRevocationRequest,
  VisitCoordinationCloneRequest,
  VisitScheduleItemResultRequest,
} from "@/lib/api/contracts/visit.schema";
import { apiFetch, withQuery } from "@/shared/api/client";
import { z } from "zod";

const ReusableTimesSchema = z.object({
  timeSlots: z.array(z.object({ startsAt: z.string(), endsAt: z.string() })),
});

const CustomerPortalSendSchema = z.object({
  accepted: z.boolean(),
  maskedEmail: z.string(),
  expiresInSeconds: z.number(),
});

const CustomerPortalVerifySchema = z.object({
  verified: z.boolean(),
  expiresInSeconds: z.number(),
});

const CustomerPortalRequestsSchema = z.object({
  available: z.boolean(),
  verified: z.boolean(),
  items: z.array(
    z.object({
      coordinationId: z.number(),
      status: z.string(),
      periodStartDate: z.string(),
      periodEndDate: z.string(),
      canRespond: z.boolean().optional(),
      canViewSchedule: z.boolean().optional(),
    }),
  ),
});

const CustomerPreferenceSchema = z.object({
  exists: z.boolean(),
  version: z.number(),
  preferredWeekdays: z.array(
    z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  ),
  preferredStartTime: z.string().nullable(),
  preferredEndTime: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  retentionUntil: z.string().nullable(),
  noticeVersion: z.string(),
  preferenceDisclosureVersion: z.string(),
  preferenceDisclosureText: z.string(),
  sessionBinding: z.string(),
});

export type CustomerPreference = z.infer<typeof CustomerPreferenceSchema>;
export type CustomerPreferenceInput = Pick<
  CustomerPreference,
  "preferredWeekdays" | "preferredStartTime" | "preferredEndTime"
> & {
  expectedVersion: number;
  acknowledgedNoticeVersion: string;
  acknowledgedPreferenceDisclosureVersion: string;
  sessionBinding: string;
};

/** 결과 기록·재조율·철회 접수·취소는 조율 건 version을 If-Match로 보낸다. */
function ifMatch(version: number) {
  return { "If-Match": String(version) };
}

export function recordItemResult(
  itemId: number,
  version: number,
  request: VisitScheduleItemResultRequest,
) {
  return apiFetch(`/api/visit-schedule-items/${itemId}/result`, {
    method: "PATCH",
    headers: ifMatch(version),
    body: request,
    schema: VisitScheduleItemResultResponseSchema,
  });
}

export function fetchResultHistory(itemId: number) {
  return apiFetch(`/api/visit-schedule-items/${itemId}/result-history`, {
    schema: VisitScheduleItemResultHistoryResponseSchema,
  });
}

export function rescheduleCoordination(
  coordinationId: number,
  version: number,
  reason: string | null,
) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/reschedule`, {
    method: "POST",
    headers: ifMatch(version),
    body: { reason },
    schema: VisitCoordinationRescheduleResponseSchema,
  });
}

export function recordAccessRevocation(
  coordinationId: number,
  version: number,
  request: StaffAccessRevocationRequest,
) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/access-revocations`, {
    method: "POST",
    headers: ifMatch(version),
    body: request,
    schema: VisitAccessRevocationResponseSchema,
  });
}

export function cancelCoordination(coordinationId: number, version: number, reason: string | null) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/cancel`, {
    method: "POST",
    headers: ifMatch(version),
    body: { reason },
    schema: VisitCoordinationCancelResponseSchema,
  });
}

export function cloneCoordination(coordinationId: number, request: VisitCoordinationCloneRequest) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/clone`, {
    method: "POST",
    body: request,
    schema: VisitCoordinationCloneResponseSchema,
  });
}

export function fetchConfirmationMessages(coordinationId: number) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/confirmation-messages`, {
    schema: ConfirmationMessagesResponseSchema,
  });
}

export function listConfirmationDeliveries(coordinationId: number) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/confirmation-deliveries`, {
    schema: ConfirmationDeliveryListResponseSchema,
  });
}

export function createConfirmationDelivery(
  coordinationId: number,
  request: ConfirmationDeliveryCreateRequest,
) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/confirmation-deliveries`, {
    method: "POST",
    body: request,
    schema: ConfirmationDeliveryResponseSchema,
  });
}

export function listAssistantNotices(itemId: number) {
  return apiFetch(`/api/visit-schedule-items/${itemId}/assistant-notices`, {
    schema: AssistantNoticeListResponseSchema,
  });
}

export function createAssistantNotice(itemId: number, request: AssistantNoticeCreateRequest) {
  return apiFetch(`/api/visit-schedule-items/${itemId}/assistant-notice`, {
    method: "POST",
    body: request,
    schema: AssistantNoticeResponseSchema,
  });
}

export function confirmAssistantNotice(
  noticeId: number,
  supervisorAdditionalNotice: string | null,
) {
  return apiFetch(`/api/visit-assistant-notices/${noticeId}/confirm`, {
    method: "POST",
    body: supervisorAdditionalNotice === null ? {} : { supervisorAdditionalNotice },
    schema: AssistantNoticeConfirmResponseSchema,
  });
}

export function listAssistantSupervision(params: { page: number; size: number }) {
  return apiFetch(withQuery("/api/visit-assistant-notices", { ...params }), {
    schema: AssistantNoticeSupervisionListResponseSchema,
  });
}

function customerBase(token: string) {
  return `/api/public/customer-visit-links/${encodeURIComponent(token)}`;
}

export function fetchCustomerLink(token: string, signal?: AbortSignal) {
  return apiFetch(customerBase(token), {
    signal,
    retry: false,
    schema: PublicVisitLinkResponseSchema,
  });
}

export function previewReusableCustomerTimes(token: string, previousToken: string) {
  return apiFetch(`${customerBase(token)}/reusable-times`, {
    method: "POST",
    body: { previousToken },
    retry: false,
    schema: ReusableTimesSchema,
  });
}

export function previewBrowserReusableCustomerTimes(token: string) {
  return apiFetch(`${customerBase(token)}/reusable-times`, {
    retry: false,
    schema: ReusableTimesSchema,
  });
}

export function sendCustomerPortalCode(token: string) {
  return apiFetch(`${customerBase(token)}/portal/otp`, {
    method: "POST",
    body: {},
    retry: false,
    schema: CustomerPortalSendSchema,
  });
}

export function verifyCustomerPortalCode(token: string, code: string) {
  return apiFetch(`${customerBase(token)}/portal/verify`, {
    method: "POST",
    body: { code },
    retry: false,
    schema: CustomerPortalVerifySchema,
  });
}

export function fetchCustomerPortalRequests(token: string) {
  return apiFetch(`${customerBase(token)}/portal`, {
    retry: false,
    schema: CustomerPortalRequestsSchema,
  });
}

export function fetchCustomerPortalIndex() {
  return apiFetch("/api/public/customer-visit-links/portal", {
    retry: false,
    schema: CustomerPortalRequestsSchema,
  });
}

export function fetchCustomerPreference() {
  return apiFetch("/api/public/customer-visit-links/portal/preferences", {
    retry: false,
    schema: CustomerPreferenceSchema,
  });
}

export function fetchCustomerLinkPreference(token: string) {
  return apiFetch(
    `/api/public/customer-visit-links/${encodeURIComponent(token)}/portal/preferences`,
    {
      retry: false,
      schema: CustomerPreferenceSchema,
    },
  );
}

export function saveCustomerPreference(input: CustomerPreferenceInput) {
  return apiFetch("/api/public/customer-visit-links/portal/preferences", {
    method: "PUT",
    body: input,
    retry: false,
    schema: CustomerPreferenceSchema,
  });
}

export function deleteCustomerPreference(expectedVersion: number, sessionBinding: string) {
  return apiFetch(
    `/api/public/customer-visit-links/portal/preferences?expectedVersion=${expectedVersion}`,
    {
      method: "DELETE",
      headers: { "X-Customer-Portal-Binding": sessionBinding },
      retry: false,
      schema: CustomerPreferenceSchema,
    },
  );
}

export function fetchCustomerPortalRequest(coordinationId: number, signal?: AbortSignal) {
  return apiFetch(`/api/public/customer-visit-links/portal/requests/${coordinationId}`, {
    signal,
    retry: false,
    schema: PublicVisitLinkResponseSchema,
  });
}

export function fetchCustomerPortalConfirmed(coordinationId: number, signal?: AbortSignal) {
  return apiFetch(`/api/public/customer-visit-links/portal/requests/${coordinationId}/confirmed`, {
    signal,
    retry: false,
    schema: PublicConfirmedVisitResponseSchema,
  });
}

export function previewCustomerPortalRequestTimes(coordinationId: number) {
  return apiFetch(
    `/api/public/customer-visit-links/portal/requests/${coordinationId}/reusable-times`,
    { retry: false, schema: ReusableTimesSchema },
  );
}

export function submitCustomerPortalTimes(
  coordinationId: number,
  request: AvailableTimesSubmitRequest,
) {
  return apiFetch(
    `/api/public/customer-visit-links/portal/requests/${coordinationId}/available-times`,
    {
      method: "POST",
      body: request,
      retry: false,
      schema: CustomerAvailableTimesResponseSchema,
    },
  );
}

export function logoutCustomerPortalIndex() {
  return apiFetch("/api/public/customer-visit-links/portal/logout", {
    method: "POST",
    body: {},
    retry: false,
  });
}

export function previewCustomerPortalTimes(token: string) {
  return apiFetch(`${customerBase(token)}/portal/reusable-times`, {
    retry: false,
    schema: ReusableTimesSchema,
  });
}

export function logoutCustomerPortal(token: string) {
  return apiFetch(`${customerBase(token)}/portal/logout`, {
    method: "POST",
    body: {},
    retry: false,
  });
}

export function submitCustomerTimes(token: string, request: AvailableTimesSubmitRequest) {
  return apiFetch(`${customerBase(token)}/available-times`, {
    method: "POST",
    body: request,
    schema: CustomerAvailableTimesResponseSchema,
  });
}

export function fetchCustomerConfirmed(token: string, signal?: AbortSignal) {
  return apiFetch(`${customerBase(token)}/confirmed`, {
    signal,
    retry: false,
    schema: PublicConfirmedVisitResponseSchema,
  });
}
