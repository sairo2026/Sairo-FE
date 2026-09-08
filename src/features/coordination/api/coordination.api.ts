import { apiFetch } from "@/shared/api/client";
import {
  parseBuyerLinkCreateResult,
  parseCoordinationCreateResult,
  parseCoordinationProperty,
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
