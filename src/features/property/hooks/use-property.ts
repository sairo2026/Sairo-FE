"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { getProperty } from "../api/property.api";
import type { PropertyDetail } from "../schemas/property.schema";

export type PropertyLoadErrorKind = "unauthenticated" | "forbidden" | "not-found" | "unknown";

export type PropertyLoadState =
  | { status: "loading" }
  | { status: "error"; kind: PropertyLoadErrorKind }
  | { status: "success"; property: PropertyDetail };

function toErrorKind(error: unknown): PropertyLoadErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 401) return "unauthenticated";
    if (error.status === 403) return "forbidden";
    if (error.status === 404) return "not-found";
  }
  return "unknown";
}

export function useProperty(propertyId: number) {
  const [state, setState] = useState<PropertyLoadState>({ status: "loading" });

  const fetchProperty = useCallback(() => {
    getProperty(propertyId)
      .then((property) => setState({ status: "success", property }))
      .catch((error: unknown) => setState({ status: "error", kind: toErrorKind(error) }));
  }, [propertyId]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    fetchProperty();
  }, [fetchProperty]);

  return { state, retry };
}
