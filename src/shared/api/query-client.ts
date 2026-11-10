import { QueryClient } from "@tanstack/react-query";

/** 조회 재시도는 API client가 맡으므로 쿼리 단계의 재시도는 끈다. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
