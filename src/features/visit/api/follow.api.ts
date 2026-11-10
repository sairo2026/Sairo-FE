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

export function recordItemResult(itemId: number, request: VisitScheduleItemResultRequest) {
  return apiFetch(`/api/visit-schedule-items/${itemId}/result`, {
    method: "PATCH",
    body: request,
    schema: VisitScheduleItemResultResponseSchema,
  });
}

export function fetchResultHistory(itemId: number) {
  return apiFetch(`/api/visit-schedule-items/${itemId}/result-history`, {
    schema: VisitScheduleItemResultHistoryResponseSchema,
  });
}

export function rescheduleCoordination(coordinationId: number, reason: string | null) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/reschedule`, {
    method: "POST",
    body: { reason },
    schema: VisitCoordinationRescheduleResponseSchema,
  });
}

export function recordAccessRevocation(
  coordinationId: number,
  request: StaffAccessRevocationRequest,
) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/access-revocations`, {
    method: "POST",
    body: request,
    schema: VisitAccessRevocationResponseSchema,
  });
}

export function cancelCoordination(coordinationId: number, reason: string | null) {
  return apiFetch(`/api/visit-coordinations/${coordinationId}/cancel`, {
    method: "POST",
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
