"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProperty } from "@/features/property/api/property.api";
import {
  fetchContract,
  listContracts,
  listRevisions,
  listStatusHistory,
} from "../api/contract.api";
import type { ContractListParams } from "../api/contract.api";

export const contractKeys = {
  all: ["contract"] as const,
  list: (params: ContractListParams) => ["contract", "list", params] as const,
  detail: (contractId: number) => ["contract", "detail", contractId] as const,
  revisions: (contractId: number) => ["contract", "revisions", contractId] as const,
  history: (contractId: number, page: number, size: number) =>
    ["contract", "history", contractId, page, size] as const,
  property: (propertyId: number) => ["contract", "property", propertyId] as const,
};

export function useContractList(params: ContractListParams) {
  return useQuery({ queryKey: contractKeys.list(params), queryFn: () => listContracts(params) });
}

export function useContract(contractId: number, enabled = true) {
  return useQuery({
    queryKey: contractKeys.detail(contractId),
    queryFn: () => fetchContract(contractId),
    enabled,
  });
}

export function useRevisions(contractId: number, enabled = true) {
  return useQuery({
    queryKey: contractKeys.revisions(contractId),
    queryFn: () => listRevisions(contractId),
    enabled,
  });
}

export function useStatusHistory(contractId: number, page: number, size: number) {
  return useQuery({
    queryKey: contractKeys.history(contractId, page, size),
    queryFn: () => listStatusHistory(contractId, page, size),
  });
}

export function useContractProperty(propertyId: number | null) {
  return useQuery({
    queryKey: contractKeys.property(propertyId ?? 0),
    queryFn: () => fetchProperty(propertyId ?? 0),
    enabled: propertyId !== null,
  });
}
