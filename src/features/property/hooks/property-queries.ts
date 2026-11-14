"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchProperty,
  listCategories,
  listFieldDefinitions,
  listOffers,
  listProperties,
} from "../api/property.api";
import type { PropertyListParams } from "../api/property.api";

export const propertyKeys = {
  all: ["property"] as const,
  list: (params: PropertyListParams) => ["property", "list", params] as const,
  detail: (propertyId: number) => ["property", "detail", propertyId] as const,
  offers: (propertyId: number) => ["property", "offers", propertyId] as const,
  categories: ["property", "categories"] as const,
  fields: (categoryId: number) => ["property", "fields", categoryId] as const,
};

export function usePropertyList(params: PropertyListParams) {
  return useQuery({
    queryKey: propertyKeys.list(params),
    queryFn: () => listProperties(params),
  });
}

export function usePropertyDetail(propertyId: number) {
  return useQuery({
    queryKey: propertyKeys.detail(propertyId),
    queryFn: () => fetchProperty(propertyId),
    enabled: propertyId > 0,
  });
}

export function usePropertyOffers(propertyId: number) {
  return useQuery({
    queryKey: propertyKeys.offers(propertyId),
    queryFn: () => listOffers(propertyId),
  });
}

export function usePropertyCategories() {
  return useQuery({ queryKey: propertyKeys.categories, queryFn: listCategories });
}

export function useFieldDefinitions(categoryId: number | null) {
  return useQuery({
    queryKey: propertyKeys.fields(categoryId ?? 0),
    queryFn: () => listFieldDefinitions(categoryId ?? 0),
    enabled: categoryId !== null,
  });
}
