"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/api/client";
import type { EntityLoadErrorKind } from "@/shared/components/entity-load-error";
import { getCoordinationDetail } from "../api/coordination.api";
import type { CoordinationDetailResult } from "../schemas/coordination.schema";

export type CoordinationDetailState =
  | { status: "loading" }
  | { status: "error"; kind: EntityLoadErrorKind }
  | { status: "success"; detail: CoordinationDetailResult };

function toErrorKind(error: unknown): EntityLoadErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 401) return "unauthenticated";
    if (error.status === 403) return "forbidden";
    if (error.status === 404) return "not-found";
  }
  return "unknown";
}

export function useCoordinationDetail(coordinationId: number) {
  const [state, setState] = useState<CoordinationDetailState>({ status: "loading" });

  const fetchDetail = useCallback(() => {
    getCoordinationDetail(coordinationId)
      .then((detail) => setState({ status: "success", detail }))
      .catch((error: unknown) => setState({ status: "error", kind: toErrorKind(error) }));
  }, [coordinationId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    fetchDetail();
  }, [fetchDetail]);

  const refetch = useCallback(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { state, retry, refetch };
}
