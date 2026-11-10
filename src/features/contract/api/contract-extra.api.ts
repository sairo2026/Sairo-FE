import {
  ContractDocumentDownloadResponseSchema,
  ContractDocumentResponseSchema,
  ContractDocumentRevisionResponseSchema,
  ContractFeeListResponseSchema,
  ContractFeeResponseSchema,
  ContractFeeRevisionResponseSchema,
  ContractFeeTransactionResponseSchema,
  ContractFollowupTaskListResponseSchema,
  ContractFollowupTaskResponseSchema,
  ContractPaymentScheduleListResponseSchema,
  ContractPaymentScheduleResponseSchema,
  ContractPaymentTransactionResponseSchema,
} from "@/lib/api/contracts/contract.schema";
import type {
  ContractFeeCreateRequest,
  ContractFeeRevisionCreateRequest,
  ContractFeeTransactionCreateRequest,
  ContractPaymentScheduleCreateRequest,
  ContractPaymentTransactionCreateRequest,
} from "@/lib/api/contracts/contract.schema";
import { apiFetch } from "@/shared/api/client";

function ifMatch(version: number) {
  return { "If-Match": String(version) };
}

export function uploadDocument(contractId: number, form: FormData) {
  return apiFetch(`/api/contracts/${contractId}/documents`, {
    method: "POST",
    body: form,
    schema: ContractDocumentResponseSchema,
  });
}

export function uploadDocumentRevision(contractId: number, documentId: number, form: FormData) {
  return apiFetch(`/api/contracts/${contractId}/documents/${documentId}/revision`, {
    method: "POST",
    body: form,
    schema: ContractDocumentRevisionResponseSchema,
  });
}

export function fetchDocumentDownload(contractId: number, documentId: number) {
  return apiFetch(`/api/contracts/${contractId}/documents/${documentId}`, {
    schema: ContractDocumentDownloadResponseSchema,
  });
}

export function listFees(contractId: number) {
  return apiFetch(`/api/contracts/${contractId}/fees`, { schema: ContractFeeListResponseSchema });
}

export function createFee(contractId: number, request: ContractFeeCreateRequest) {
  return apiFetch(`/api/contracts/${contractId}/fees`, {
    method: "POST",
    body: request,
    schema: ContractFeeResponseSchema,
  });
}

export function createFeeRevision(
  feeId: number,
  version: number,
  request: ContractFeeRevisionCreateRequest,
) {
  return apiFetch(`/api/contract-fees/${feeId}/revisions`, {
    method: "POST",
    body: request,
    headers: ifMatch(version),
    schema: ContractFeeRevisionResponseSchema,
  });
}

export function createFeeTransaction(
  feeId: number,
  version: number,
  request: ContractFeeTransactionCreateRequest,
) {
  return apiFetch(`/api/contract-fees/${feeId}/transactions`, {
    method: "POST",
    body: request,
    headers: ifMatch(version),
    schema: ContractFeeTransactionResponseSchema,
  });
}

export function listSchedules(contractId: number) {
  return apiFetch(`/api/contracts/${contractId}/payment-schedules`, {
    schema: ContractPaymentScheduleListResponseSchema,
  });
}

export function createSchedule(contractId: number, request: ContractPaymentScheduleCreateRequest) {
  return apiFetch(`/api/contracts/${contractId}/payment-schedules`, {
    method: "POST",
    body: request,
    schema: ContractPaymentScheduleResponseSchema,
  });
}

export function createPaymentTransaction(
  scheduleId: number,
  version: number,
  request: ContractPaymentTransactionCreateRequest,
) {
  return apiFetch(`/api/payment-schedules/${scheduleId}/transactions`, {
    method: "POST",
    body: request,
    headers: ifMatch(version),
    schema: ContractPaymentTransactionResponseSchema,
  });
}

export function listFollowups(contractId: number) {
  return apiFetch(`/api/contracts/${contractId}/followup-tasks`, {
    schema: ContractFollowupTaskListResponseSchema,
  });
}

export function markFollowupSubmitted(taskId: number, version: number) {
  return apiFetch(`/api/contract-followup-tasks/${taskId}`, {
    method: "PATCH",
    body: { submitted: true },
    headers: ifMatch(version),
    schema: ContractFollowupTaskResponseSchema,
  });
}
