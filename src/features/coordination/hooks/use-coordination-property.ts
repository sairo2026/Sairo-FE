"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { getCoordinationProperty } from "../api/coordination.api";
import type { CoordinationProperty } from "../schemas/coordination.schema";

export type CoordinationPropertyErrorKind =
  "unauthenticated" | "forbidden" | "not-found" | "unknown";

export type CoordinationPropertyState =
  | { status: "loading" }
  | { status: "error"; kind: CoordinationPropertyErrorKind }
  | { status: "success"; property: CoordinationProperty };

function toErrorKind(error: unknown): CoordinationPropertyErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 401) return "unauthenticated";
    if (error.status === 403) return "forbidden";
    if (error.status === 404) return "not-found";
  }
  return "unknown";
}

export function useCoordinationProperty(propertyId: number) {
  const [state, setState] = useState<CoordinationPropertyState>({ status: "loading" });

  const fetchProperty = useCallback(() => {
    getCoordinationProperty(propertyId)
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
