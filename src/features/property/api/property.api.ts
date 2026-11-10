import {
  PropertyCategoryListResponseSchema,
  PropertyCategoryResponseSchema,
  PropertyCategoryUpdateResponseSchema,
  PropertyCategoryChangeResponseSchema,
  PropertyCreateResponseSchema,
  PropertyDetailResponseSchema,
  PropertyDuplicateCheckResponseSchema,
  PropertyFieldDefinitionListResponseSchema,
  PropertyFieldDefinitionResponseSchema,
  PropertyFieldDefinitionUpdateResponseSchema,
  PropertyFieldValueResponseSchema,
  PropertyListResponseSchema,
  PropertyOfferListResponseSchema,
  PropertyOfferResponseSchema,
  PropertyOfferUpdateResponseSchema,
  PropertyPhotoResponseSchema,
  PropertyPhotoUpdateResponseSchema,
  PropertyRestoreResponseSchema,
  PropertyUpdateResponseSchema,
} from "@/lib/api/contracts/property.schema";
import type {
  PropertyCategoryCreateRequest,
  PropertyCategoryUpdateRequest,
  PropertyCreateRequest,
  PropertyFieldDefinitionCreateRequest,
  PropertyFieldDefinitionUpdateRequest,
  PropertyOfferCreateRequest,
  PropertyOfferUpdateRequest,
  PropertyPhotoUpdateRequest,
  PropertyUpdateRequest,
} from "@/lib/api/contracts/property.schema";
import { apiFetch, withQuery } from "@/shared/api/client";

export type PropertyListParams = {
  keyword?: string;
  categoryId?: number;
  dealType?: string;
  priceMin?: number;
  priceMax?: number;
  areaType?: string;
  areaMin?: number;
  areaMax?: number;
  managingMembershipId?: number;
  registrationStage?: string;
  archived?: boolean;
  page: number;
  size: number;
};

function ifMatch(version: number) {
  return { "If-Match": String(version) };
}

export function listProperties(params: PropertyListParams) {
  return apiFetch(withQuery("/api/properties", { ...params }), {
    schema: PropertyListResponseSchema,
  });
}

export function checkDuplicateProperty(address: string, addressDetail: string) {
  return apiFetch(
    withQuery("/api/properties/duplicate-check", {
      address,
      addressDetail: addressDetail === "" ? undefined : addressDetail,
    }),
    { schema: PropertyDuplicateCheckResponseSchema },
  );
}

export function createProperty(request: PropertyCreateRequest) {
  return apiFetch("/api/properties", {
    method: "POST",
    body: request,
    schema: PropertyCreateResponseSchema,
  });
}

export function fetchProperty(propertyId: number) {
  return apiFetch(`/api/properties/${propertyId}`, { schema: PropertyDetailResponseSchema });
}

export function updateProperty(
  propertyId: number,
  request: PropertyUpdateRequest,
  version: number,
) {
  return apiFetch(`/api/properties/${propertyId}`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(version),
    schema: PropertyUpdateResponseSchema,
  });
}

export function changePropertyCategory(propertyId: number, categoryId: number, version: number) {
  return apiFetch(`/api/properties/${propertyId}/category`, {
    method: "PATCH",
    body: { categoryId },
    headers: ifMatch(version),
    schema: PropertyCategoryChangeResponseSchema,
  });
}

export function archiveProperty(propertyId: number) {
  return apiFetch(`/api/properties/${propertyId}`, { method: "DELETE" });
}

export function restoreProperty(propertyId: number) {
  return apiFetch(`/api/properties/${propertyId}/restore`, {
    method: "POST",
    schema: PropertyRestoreResponseSchema,
  });
}

export function putFieldValue(
  propertyId: number,
  fieldDefinitionId: number,
  value: string | number | boolean | null,
  version: number,
) {
  return apiFetch(`/api/properties/${propertyId}/fields/${fieldDefinitionId}`, {
    method: "PUT",
    headers: ifMatch(version),
    body: { value },
    schema: PropertyFieldValueResponseSchema,
  });
}

export function uploadPhoto(propertyId: number, form: FormData) {
  return apiFetch(`/api/properties/${propertyId}/photos`, {
    method: "POST",
    body: form,
    schema: PropertyPhotoResponseSchema,
  });
}

export function updatePhoto(
  propertyId: number,
  photoId: number,
  request: PropertyPhotoUpdateRequest,
  version: number,
) {
  return apiFetch(`/api/properties/${propertyId}/photos/${photoId}`, {
    method: "PATCH",
    headers: ifMatch(version),
    body: request,
    schema: PropertyPhotoUpdateResponseSchema,
  });
}

export function deletePhoto(propertyId: number, photoId: number) {
  return apiFetch(`/api/properties/${propertyId}/photos/${photoId}`, { method: "DELETE" });
}

export function listOffers(propertyId: number) {
  return apiFetch(`/api/properties/${propertyId}/offers`, {
    schema: PropertyOfferListResponseSchema,
  });
}

export function createOffer(propertyId: number, request: PropertyOfferCreateRequest) {
  return apiFetch(`/api/properties/${propertyId}/offers`, {
    method: "POST",
    body: request,
    schema: PropertyOfferResponseSchema,
  });
}

export function updateOffer(
  propertyId: number,
  offerId: number,
  request: PropertyOfferUpdateRequest,
  version: number,
) {
  return apiFetch(`/api/properties/${propertyId}/offers/${offerId}`, {
    method: "PATCH",
    body: request,
    headers: ifMatch(version),
    schema: PropertyOfferUpdateResponseSchema,
  });
}

export function listCategories() {
  return apiFetch("/api/property-categories", { schema: PropertyCategoryListResponseSchema });
}

export function createCategory(request: PropertyCategoryCreateRequest) {
  return apiFetch("/api/property-categories", {
    method: "POST",
    body: request,
    schema: PropertyCategoryResponseSchema,
  });
}

export function updateCategory(categoryId: number, request: PropertyCategoryUpdateRequest) {
  return apiFetch(`/api/property-categories/${categoryId}`, {
    method: "PATCH",
    body: request,
    schema: PropertyCategoryUpdateResponseSchema,
  });
}

export function listFieldDefinitions(categoryId: number) {
  return apiFetch(`/api/property-categories/${categoryId}/fields`, {
    schema: PropertyFieldDefinitionListResponseSchema,
  });
}

export function createFieldDefinition(
  categoryId: number,
  request: PropertyFieldDefinitionCreateRequest,
) {
  return apiFetch(`/api/property-categories/${categoryId}/fields`, {
    method: "POST",
    body: request,
    schema: PropertyFieldDefinitionResponseSchema,
  });
}

export function updateFieldDefinition(
  categoryId: number,
  fieldDefinitionId: number,
  request: PropertyFieldDefinitionUpdateRequest,
) {
  return apiFetch(`/api/property-categories/${categoryId}/fields/${fieldDefinitionId}`, {
    method: "PATCH",
    body: request,
    schema: PropertyFieldDefinitionUpdateResponseSchema,
  });
}
