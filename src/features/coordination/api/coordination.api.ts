import { apiFetch } from "@/shared/api/client";
import {
  parseBuyerLinkCreateResult,
  parseCoordinationCreateResult,
  parseCoordinationDetailResult,
  parseCoordinationListResult,
  parseCoordinationProperty,
  parseHomeSummaryResult,
  parseResponseRestartResult,
} from "../schemas/coordination.schema";

export type CoordinationCreateInput = {
  tenantName: string;
  tenantPhone: string;
  candidateTimes: Date[];
};

export async function getCoordinationProperty(propertyId: number) {
  return parseCoordinationProperty(await apiFetch<unknown>(`/api/properties/${propertyId}`));
}

export async function createCoordination(propertyId: number, input: CoordinationCreateInput) {
  return parseCoordinationCreateResult(
    await apiFetch<unknown>(`/api/properties/${propertyId}/coordinations`, {
      method: "POST",
      body: {
        tenantName: input.tenantName,
        tenantPhone: input.tenantPhone,
        candidateTimes: input.candidateTimes.map((date) => ({ startsAt: date.toISOString() })),
      },
    }),
  );
}

export async function createBuyerLink(coordinationId: number) {
  return parseBuyerLinkCreateResult(
    await apiFetch<unknown>(`/api/coordinations/${coordinationId}/buyers`, { method: "POST" }),
  );
}

export async function getCoordinationList() {
  return parseCoordinationListResult(await apiFetch<unknown>("/api/coordinations"));
}

export async function getHomeSummary() {
  return parseHomeSummaryResult(await apiFetch<unknown>("/api/home"));
}

export async function getCoordinationDetail(coordinationId: number) {
  return parseCoordinationDetailResult(
    await apiFetch<unknown>(`/api/coordinations/${coordinationId}`),
  );
}

export async function confirmCoordination(
  coordinationId: number,
  input: { buyerResponseId: number; candidateTimeId: number },
) {
  await apiFetch<unknown>(`/api/coordinations/${coordinationId}/confirm`, {
    method: "POST",
    body: input,
  });
}

export async function completeVisit(coordinationId: number) {
  await apiFetch<unknown>(`/api/coordinations/${coordinationId}/visit-complete`, {
    method: "POST",
  });
}

export async function cancelCoordination(coordinationId: number) {
  await apiFetch<unknown>(`/api/coordinations/${coordinationId}/cancel`, {
    method: "POST",
  });
}

export async function restartResponse(
  coordinationId: number,
  responseId: number,
  candidateTimeIds: number[],
) {
  return parseResponseRestartResult(
    await apiFetch<unknown>(
      `/api/coordinations/${coordinationId}/responses/${responseId}/restart`,
      { method: "POST", body: { candidateTimeIds } },
    ),
  );
}
