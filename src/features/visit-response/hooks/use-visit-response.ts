"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { getVisitResponse } from "../api/visit-response.api";
import type { PublicVisitResponse } from "../schemas/visit-response.schema";

export type VisitResponseState =
  | { status: "loading" }
  | { status: "expired" }
  | { status: "error" }
  | { status: "success"; response: PublicVisitResponse };

export function useVisitResponse(token: string) {
  const [state, setState] = useState<VisitResponseState>({ status: "loading" });

  const fetchResponse = useCallback(() => {
    getVisitResponse(token)
      .then((response) => setState({ status: "success", response }))
      .catch((error: unknown) => {
        setState({
          status: error instanceof ApiError && error.status === 404 ? "expired" : "error",
        });
      });
  }, [token]);

  useEffect(() => {
    fetchResponse();
  }, [fetchResponse]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    fetchResponse();
  }, [fetchResponse]);

  const setResponse = useCallback((response: PublicVisitResponse) => {
    setState({ status: "success", response });
  }, []);

  return { state, retry, setResponse };
}
