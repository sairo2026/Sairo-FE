import {
  CandidatePropertyFilterResponseSchema,
  CustomerConsultationCreateResponseSchema,
  CustomerConsultationListResponseSchema,
  CustomerConsultationRevisionListResponseSchema,
  CustomerConsultationUpdateResponseSchema,
  CustomerCreateResponseSchema,
  CustomerDetailResponseSchema,
  CustomerListResponseSchema,
  CustomerMergeResponseSchema,
  CustomerRestoreResponseSchema,
  CustomerUpdateResponseSchema,
  DemandConditionCreateResponseSchema,
  DemandConditionUpdateResponseSchema,
  DuplicateCustomerCheckResponseSchema,
  OwnerOccupantCreateResponseSchema,
  OwnerOccupantUpdateResponseSchema,
  PropertyInterestCreateResponseSchema,
  PropertyInterestUpdateResponseSchema,
} from "@/lib/api/contracts/customer.schema";
import type {
  CustomerConsultationCreateRequest,
  CustomerConsultationUpdateRequest,
  CustomerCreateRequest,
  CustomerMergeRequest,
  CustomerUpdateRequest,
  DemandConditionCreateRequest,
  DemandConditionUpdateRequest,
  OwnerOccupantCreateRequest,
  OwnerOccupantUpdateRequest,
  PropertyInterestCreateRequest,
  PropertyInterestUpdateRequest,
} from "@/lib/api/contracts/customer.schema";
import {
  PropertyCategoryListResponseSchema,
  PropertyListResponseSchema,
} from "@/lib/api/contracts/property.schema";
import { apiFetch, withQuery } from "@/shared/api/client";

export type CustomerListParams = {
  role?: string;
  keyword?: string;
  archived?: boolean;
  page: number;
  size: number;
};

function ifMatch(version: number) {
  return { "If-Match": String(version) };
}

export function listCustomers(params: CustomerListParams) {
  return apiFetch(withQuery("/api/customers", { ...params }), {
    schema: CustomerListResponseSchema,
  });
}

export function findDuplicateCustomers(name: string, phone: string) {
  return apiFetch(withQuery("/api/customers/duplicate-candidates", { name, phone }), {
    schema: DuplicateCustomerCheckResponseSchema,
  });
}

export function createCustomer(request: CustomerCreateRequest) {
  return apiFetch("/api/customers", {
    method: "POST",
    body: request,
    schema: CustomerCreateResponseSchema,
  });
}

export function fetchCustomer(customerId: number) {
  return apiFetch(`/api/customers/${customerId}`, { schema: CustomerDetailResponseSchema });
}

export function updateCustomer(
  customerId: number,
  request: CustomerUpdateRequest,
  version: number,
) {
  return apiFetch(`/api/customers/${customerId}`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(version),
    schema: CustomerUpdateResponseSchema,
  });
}

export function deleteCustomer(customerId: number) {
  return apiFetch(`/api/customers/${customerId}`, { method: "DELETE" });
}

export function restoreCustomer(customerId: number) {
  return apiFetch(`/api/customers/${customerId}/restore`, {
    method: "POST",
    schema: CustomerRestoreResponseSchema,
  });
}

export function mergeCustomers(request: CustomerMergeRequest, primaryVersion: number) {
  return apiFetch("/api/customers/merge", {
    method: "POST",
    body: request,
    headers: ifMatch(primaryVersion),
    schema: CustomerMergeResponseSchema,
  });
}

export function listConsultations(customerId: number) {
  return apiFetch(`/api/customers/${customerId}/consultations`, {
    schema: CustomerConsultationListResponseSchema,
  });
}

export function createConsultation(customerId: number, request: CustomerConsultationCreateRequest) {
  return apiFetch(`/api/customers/${customerId}/consultations`, {
    method: "POST",
    body: request,
    schema: CustomerConsultationCreateResponseSchema,
  });
}

export function updateConsultation(
  consultationId: number,
  request: CustomerConsultationUpdateRequest,
  version: number,
) {
  return apiFetch(`/api/customer-consultations/${consultationId}`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(version),
    schema: CustomerConsultationUpdateResponseSchema,
  });
}

export function listConsultationRevisions(consultationId: number) {
  return apiFetch(`/api/customer-consultations/${consultationId}/revisions`, {
    schema: CustomerConsultationRevisionListResponseSchema,
  });
}

export function createPropertyInterest(customerId: number, request: PropertyInterestCreateRequest) {
  return apiFetch(`/api/customers/${customerId}/property-interests`, {
    method: "POST",
    body: request,
    schema: PropertyInterestCreateResponseSchema,
  });
}

export function updatePropertyInterest(
  interestId: number,
  request: PropertyInterestUpdateRequest,
  customerVersion: number,
) {
  return apiFetch(`/api/customer-property-interests/${interestId}`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(customerVersion),
    schema: PropertyInterestUpdateResponseSchema,
  });
}

export function createOwnerOccupant(propertyId: number, request: OwnerOccupantCreateRequest) {
  return apiFetch(`/api/properties/${propertyId}/owner-occupants`, {
    method: "POST",
    body: request,
    schema: OwnerOccupantCreateResponseSchema,
  });
}

export function updateOwnerOccupant(
  linkId: number,
  request: OwnerOccupantUpdateRequest,
  customerVersion: number,
) {
  return apiFetch(`/api/owner-occupants/${linkId}`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(customerVersion),
    schema: OwnerOccupantUpdateResponseSchema,
  });
}

export function createDemandCondition(customerId: number, request: DemandConditionCreateRequest) {
  return apiFetch(`/api/customers/${customerId}/demand-conditions`, {
    method: "POST",
    body: request,
    schema: DemandConditionCreateResponseSchema,
  });
}

export function updateDemandCondition(
  conditionId: number,
  request: DemandConditionUpdateRequest,
  version: number,
) {
  return apiFetch(`/api/demand-conditions/${conditionId}`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(version),
    schema: DemandConditionUpdateResponseSchema,
  });
}

export function fetchCandidateProperties(conditionId: number) {
  return apiFetch(`/api/demand-conditions/${conditionId}/candidate-properties`, {
    schema: CandidatePropertyFilterResponseSchema,
  });
}

export function searchPropertiesByKeyword(keyword: string) {
  return apiFetch(withQuery("/api/properties", { keyword, page: 0, size: 25 }), {
    schema: PropertyListResponseSchema,
  });
}

export function listPropertyCategories() {
  return apiFetch("/api/property-categories", { schema: PropertyCategoryListResponseSchema });
}
