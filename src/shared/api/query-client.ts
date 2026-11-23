import { QueryClient } from "@tanstack/react-query";
import { isTransientGatewayError } from "./error-kind";

/** 서버 재시작을 넘길 수 있도록 대기 간격(ms)을 늘려 가며 합계 약 90초까지 다시 시도한다. */
const TRANSIENT_RETRY_DELAYS_MS = [
  1_000, 2_000, 4_000, 8_000, 15_000, 15_000, 15_000, 15_000, 15_000,
];

/** 접근 상태 확인처럼 화면을 열기 전에 꼭 필요한 조회에만 쓴다. 일시적인 서버 오류만 다시 시도한다. */
export function shouldRetryTransient(failureCount: number, error: unknown): boolean {
  return failureCount < TRANSIENT_RETRY_DELAYS_MS.length && isTransientGatewayError(error);
}

/** 동시에 열린 화면이 같은 순간에 몰리지 않도록 대기 시간의 75~100%에서 무작위로 고른다. */
export function transientRetryDelay(
  failureCount: number,
  random: () => number = Math.random,
): number {
  const base =
    TRANSIENT_RETRY_DELAYS_MS[Math.min(failureCount, TRANSIENT_RETRY_DELAYS_MS.length - 1)] ?? 0;
  return Math.round(base * (0.75 + 0.25 * random()));
}

export const TRANSIENT_RETRY_OPTIONS = {
  retry: shouldRetryTransient,
  retryDelay: (failureCount: number) => transientRetryDelay(failureCount),
} as const;

/** 일반 조회 재시도는 API client가 맡으므로 쿼리 단계의 재시도는 끈다. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
