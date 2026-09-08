"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { getHomeSummary } from "@/features/coordination/api/coordination.api";
import type { HomeSummaryResult } from "@/features/coordination/schemas/coordination.schema";
import type { EntityLoadErrorKind } from "@/shared/components/entity-load-error";

export type HomeSummaryState =
  | { status: "loading" }
  | { status: "error"; kind: EntityLoadErrorKind }
  | { status: "success"; summary: HomeSummaryResult };

function toErrorKind(error: unknown): EntityLoadErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 401) return "unauthenticated";
    if (error.status === 403) return "forbidden";
  }
  return "unknown";
}

export function useHomeSummary() {
  const [state, setState] = useState<HomeSummaryState>({ status: "loading" });

  const fetchSummary = useCallback(() => {
    getHomeSummary()
      .then((summary) => setState({ status: "success", summary }))
      .catch((error: unknown) => setState({ status: "error", kind: toErrorKind(error) }));
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    fetchSummary();
  }, [fetchSummary]);

  return { state, retry };
}
