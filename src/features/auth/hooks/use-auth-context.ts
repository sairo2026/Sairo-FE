"use client";

import { useQuery } from "@tanstack/react-query";
import { authContextQueryKey } from "@/shared/session/auth-context-key";
import { fetchAuthContext, fetchOperatorMe } from "../api/auth-context.api";

export { authContextQueryKey };
export const operatorQueryKey = ["ops", "me"] as const;

/** 로그인한 사용자의 접근 상태 8조건 판정 결과. */
export function useAuthContext() {
  return useQuery({ queryKey: authContextQueryKey, queryFn: fetchAuthContext });
}

export function useOperatorMe() {
  return useQuery({ queryKey: operatorQueryKey, queryFn: fetchOperatorMe });
}
