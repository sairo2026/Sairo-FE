"use client";

import { useQuery } from "@tanstack/react-query";
import { isTransientGatewayError } from "@/shared/api/error-kind";
import { TRANSIENT_RETRY_OPTIONS } from "@/shared/api/query-client";
import { authContextQueryKey } from "@/shared/session/auth-context-key";
import { fetchAuthContext, fetchOperatorMe } from "../api/auth-context.api";

export { authContextQueryKey };
export const operatorQueryKey = ["ops", "me"] as const;

/** 로그인한 사용자의 접근 상태 8조건 판정 결과. 서버가 재시작하는 동안에는 자동으로 다시 시도한다. */
export function useAuthContext() {
  return useQuery({
    queryKey: authContextQueryKey,
    queryFn: fetchAuthContext,
    ...TRANSIENT_RETRY_OPTIONS,
  });
}

export function useOperatorMe() {
  return useQuery({
    queryKey: operatorQueryKey,
    queryFn: fetchOperatorMe,
    ...TRANSIENT_RETRY_OPTIONS,
  });
}

/** 아직 응답을 받지 못했고 일시적인 서버 오류로 자동 재연결을 시도하는 중인지 알려준다. */
export function isReconnecting(query: {
  isPending: boolean;
  failureCount: number;
  failureReason: unknown;
}): boolean {
  return query.isPending && query.failureCount > 0 && isTransientGatewayError(query.failureReason);
}
