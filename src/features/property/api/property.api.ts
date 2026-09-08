import { apiFetch } from "@/shared/api/client";
import {
  parseDuplicateProperties,
  parsePropertyDetail,
  parsePropertyList,
  type PropertyDealType,
} from "../schemas/property.schema";

export type PropertyCreateInput = {
  address: string;
  addressDetail: string | null;
  propertyName: string | null;
  dealType: PropertyDealType;
};

export type PropertyUpdateInput = Omit<PropertyCreateInput, "dealType">;

export async function getProperties() {
  return parsePropertyList(await apiFetch<unknown>("/api/properties"));
}

export async function getProperty(propertyId: number) {
  return parsePropertyDetail(await apiFetch<unknown>(`/api/properties/${propertyId}`));
}

export async function checkDuplicateAddress(address: string) {
  const query = new URLSearchParams({ address });
  return parseDuplicateProperties(
    await apiFetch<unknown>(`/api/properties/duplicate-check?${query.toString()}`),
  );
}

export async function createProperty(input: PropertyCreateInput) {
  return parsePropertyDetail(
    await apiFetch<unknown>("/api/properties", { method: "POST", body: input }),
  );
}

export async function updateProperty(propertyId: number, input: PropertyUpdateInput) {
  return parsePropertyDetail(
    await apiFetch<unknown>(`/api/properties/${propertyId}`, { method: "PATCH", body: input }),
  );
}
