"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchCandidateProperties,
  fetchCustomer,
  listConsultationRevisions,
  listConsultations,
  listCustomers,
  listPropertyCategories,
  searchPropertiesByKeyword,
} from "../api/customer.api";
import type { CustomerListParams } from "../api/customer.api";

export const customerKeys = {
  all: ["customer"] as const,
  list: (params: CustomerListParams) => ["customer", "list", params] as const,
  detail: (customerId: number) => ["customer", "detail", customerId] as const,
  consultations: (customerId: number) => ["customer", "consultations", customerId] as const,
  revisions: (consultationId: number) => ["customer", "revisions", consultationId] as const,
  candidates: (conditionId: number) => ["customer", "candidates", conditionId] as const,
  propertySearch: (keyword: string) => ["customer", "property-search", keyword] as const,
  categories: ["customer", "property-categories"] as const,
};

export function useCustomerList(params: CustomerListParams) {
  return useQuery({ queryKey: customerKeys.list(params), queryFn: () => listCustomers(params) });
}

export function useCustomerDetail(customerId: number) {
  return useQuery({
    queryKey: customerKeys.detail(customerId),
    queryFn: () => fetchCustomer(customerId),
  });
}

export function useConsultations(customerId: number) {
  return useQuery({
    queryKey: customerKeys.consultations(customerId),
    queryFn: () => listConsultations(customerId),
  });
}

export function useConsultationRevisions(consultationId: number) {
  return useQuery({
    queryKey: customerKeys.revisions(consultationId),
    queryFn: () => listConsultationRevisions(consultationId),
  });
}

export function useCandidateProperties(conditionId: number, enabled: boolean) {
  return useQuery({
    queryKey: customerKeys.candidates(conditionId),
    queryFn: () => fetchCandidateProperties(conditionId),
    enabled,
  });
}

export function usePropertySearch(keyword: string) {
  return useQuery({
    queryKey: customerKeys.propertySearch(keyword),
    queryFn: () => searchPropertiesByKeyword(keyword),
    enabled: keyword.trim() !== "",
  });
}

export function usePropertyCategoryOptions() {
  return useQuery({ queryKey: customerKeys.categories, queryFn: listPropertyCategories });
}
