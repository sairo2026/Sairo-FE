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

const POLL_INTERVAL_MS = 8_000;

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

  useEffect(() => {
    const intervalId = setInterval(() => {
      getCoordinationDetail(coordinationId)
        .then((detail) => setState({ status: "success", detail }))
        .catch(() => {
          // 화면이 열려 있는 동안의 백그라운드 갱신이라 일시적 실패는 무시하고 마지막으로 불러온 화면을 유지한다.
        });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [coordinationId]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    fetchDetail();
  }, [fetchDetail]);

  const refetch = useCallback(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { state, retry, refetch };
}
