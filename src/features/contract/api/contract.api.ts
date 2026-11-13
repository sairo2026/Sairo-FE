import { z } from "zod";
import {
  ContractCreateResponseSchema,
  ContractDetailResponseSchema,
  ContractDraftMutationResponseSchema,
  ContractDraftUpdateResponseSchema,
  ContractDuplicateExclusionResponseSchema,
  ContractListResponseSchema,
  ContractRenewResponseSchema,
  ContractRevisionListResponseSchema,
  ContractRevisionResponseSchema,
  ContractSettlementStatusResponseSchema,
  ContractSignResponseSchema,
  ContractStatusHistoryResponseSchema,
  ContractStatusUpdateResponseSchema,
} from "@/lib/api/contracts/contract.schema";
import type {
  ContractCreateRequest,
  ContractDraftCreateRequest,
  ContractDraftUpdateRequest,
  ContractDuplicateExclusionRequest,
  ContractRenewRequest,
  ContractSettlementStatusUpdateRequest,
  ContractStatusUpdateRequest,
} from "@/lib/api/contracts/contract.schema";
import { apiFetch, withQuery } from "@/shared/api/client";

function ifMatch(version: number) {
  return { "If-Match": String(version) };
}

export const CorrectionPartySchema = z.object({
  partyId: z.number().nullable(),
  sequenceNo: z.number(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  customerId: z.number().nullable().optional(),
});

export const ContractCorrectionRequestSchema = z.object({
  baseRevisionId: z.number(),
  reason: z.string(),
  effectiveAt: z.iso.datetime({ offset: true }),
  signedDate: z.iso.date(),
  dealType: z.enum(["SALE", "JEONSE", "MONTHLY"]),
  salePrice: z.number().nullable(),
  depositAmount: z.number().nullable(),
  monthlyRentAmount: z.number().nullable(),
  balanceDueDate: z.iso.date().nullable(),
  balanceDueDatePendingReason: z.string().nullable(),
  leaseStartDate: z.iso.date().nullable(),
  leaseEndDate: z.iso.date().nullable(),
  sellerLandlordParties: z.array(CorrectionPartySchema),
  buyerTenantParties: z.array(CorrectionPartySchema),
});
export type ContractCorrectionRequest = z.infer<typeof ContractCorrectionRequestSchema>;

export type ContractListParams = {
  contractStatus?: string;
  propertyAddress?: string;
  partyName?: string;
  includeExcluded?: boolean;
  leaseEndWithinDays?: number;
  page: number;
  size: number;
};

export function listContracts(params: ContractListParams) {
  return apiFetch(withQuery("/api/contracts", { ...params }), {
    schema: ContractListResponseSchema,
  });
}

export function fetchContract(contractId: number) {
  return apiFetch(`/api/contracts/${contractId}`, { schema: ContractDetailResponseSchema });
}

export function createDraft(propertyId: number, request: ContractDraftCreateRequest) {
  return apiFetch(`/api/properties/${propertyId}/contracts/drafts`, {
    method: "POST",
    body: request,
    schema: ContractDraftMutationResponseSchema,
  });
}

export function updateDraft(
  contractId: number,
  version: number,
  request: ContractDraftUpdateRequest,
) {
  return apiFetch(`/api/contracts/${contractId}/draft`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(version),
    schema: ContractDraftUpdateResponseSchema,
  });
}

export function deleteDraft(contractId: number) {
  return apiFetch(`/api/contracts/${contractId}/draft`, { method: "DELETE" });
}

export function signDraft(contractId: number, version: number) {
  return apiFetch(`/api/contracts/${contractId}/sign`, {
    method: "POST",
    headers: ifMatch(version),
    schema: ContractSignResponseSchema,
  });
}

export function createSignedContract(propertyId: number, request: ContractCreateRequest) {
  return apiFetch(`/api/properties/${propertyId}/contracts`, {
    method: "POST",
    body: request,
    schema: ContractCreateResponseSchema,
  });
}

export function listRevisions(contractId: number) {
  return apiFetch(`/api/contracts/${contractId}/revisions`, {
    schema: ContractRevisionListResponseSchema,
  });
}

export function correctContract(
  contractId: number,
  version: number,
  request: ContractCorrectionRequest,
) {
  return apiFetch(`/api/contracts/${contractId}/corrections`, {
    method: "POST",
    body: request,
    headers: ifMatch(version),
    schema: ContractRevisionResponseSchema,
  });
}

export function updateContractStatus(
  contractId: number,
  version: number,
  request: ContractStatusUpdateRequest,
) {
  return apiFetch(`/api/contracts/${contractId}/status`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(version),
    schema: ContractStatusUpdateResponseSchema,
  });
}

export function updateSettlementStatus(
  contractId: number,
  version: number,
  request: ContractSettlementStatusUpdateRequest,
) {
  return apiFetch(`/api/contracts/${contractId}/settlement-status`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(version),
    schema: ContractSettlementStatusResponseSchema,
  });
}

export function listStatusHistory(contractId: number, page: number, size: number) {
  return apiFetch(withQuery(`/api/contracts/${contractId}/status-history`, { page, size }), {
    schema: ContractStatusHistoryResponseSchema,
  });
}

export function excludeDuplicate(
  contractId: number,
  version: number,
  request: ContractDuplicateExclusionRequest,
) {
  return apiFetch(`/api/contracts/${contractId}/duplicate-exclusion`, {
    method: "POST",
    body: request,
    headers: ifMatch(version),
    schema: ContractDuplicateExclusionResponseSchema,
  });
}

export function renewContract(contractId: number, request: ContractRenewRequest) {
  return apiFetch(`/api/contracts/${contractId}/renew`, {
    method: "POST",
    body: request,
    schema: ContractRenewResponseSchema,
  });
}
