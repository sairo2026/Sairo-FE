import {
  ImportSupportApproveResponseSchema,
  ImportSupportCancelResponseSchema,
  ImportSupportChangeResponseSchema,
  ImportSupportPaymentConfirmResponseSchema,
  ImportSupportQuoteAcceptResponseSchema,
  ImportSupportRequestListResponseSchema,
  ImportSupportRequestStatusResponseSchema,
} from "@/lib/api/contracts/migration.schema";
import type {
  ImportSupportPaymentConfirmRequest,
  ImportSupportRequestCreateRequest,
} from "@/lib/api/contracts/migration.schema";
import { apiFetch, withQuery } from "@/shared/api/client";
import { SupportDetailWireSchema } from "./wire";

export function listImportSupportRequests(params: { page: number; size: number; status?: string }) {
  return apiFetch(
    withQuery("/api/import-support-requests", {
      page: params.page,
      size: params.size,
      status: params.status || undefined,
    }),
    { schema: ImportSupportRequestListResponseSchema },
  );
}

export function createImportSupportRequest(request: ImportSupportRequestCreateRequest) {
  return apiFetch("/api/import-support-requests", {
    method: "POST",
    body: request,
    schema: ImportSupportRequestStatusResponseSchema,
  });
}

export function fetchImportSupportRequest(requestId: number) {
  return apiFetch(`/api/import-support-requests/${requestId}`, {
    schema: SupportDetailWireSchema,
  });
}

export function acceptImportSupportQuote(requestId: number) {
  return apiFetch(`/api/import-support-requests/${requestId}/accept-quote`, {
    method: "POST",
    schema: ImportSupportQuoteAcceptResponseSchema,
  });
}

export function confirmImportSupportPayment(request: {
  requestId: number;
  body: ImportSupportPaymentConfirmRequest;
}) {
  return apiFetch(`/api/import-support-requests/${request.requestId}/payment/confirm`, {
    method: "POST",
    body: request.body,
    schema: ImportSupportPaymentConfirmResponseSchema,
  });
}

export function approveImportSupport(request: { requestId: number; version: number }) {
  return apiFetch(`/api/import-support-requests/${request.requestId}/approve`, {
    method: "POST",
    headers: { "If-Match": String(request.version) },
    schema: ImportSupportApproveResponseSchema,
  });
}

export function requestImportSupportChanges(request: {
  requestId: number;
  version: number;
  reason: string;
}) {
  return apiFetch(`/api/import-support-requests/${request.requestId}/request-changes`, {
    method: "POST",
    headers: { "If-Match": String(request.version) },
    body: { reason: request.reason },
    schema: ImportSupportChangeResponseSchema,
  });
}

export function cancelImportSupport(request: {
  requestId: number;
  version: number;
  reason?: string;
}) {
  return apiFetch(`/api/import-support-requests/${request.requestId}/cancel`, {
    method: "POST",
    headers: { "If-Match": String(request.version) },
    body: request.reason ? { reason: request.reason } : {},
    schema: ImportSupportCancelResponseSchema,
  });
}
