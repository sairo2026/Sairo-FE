"use client";

import { useQuery } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { normalizeLinkToken } from "@/shared/lib/link-token";
import { ErrorScreen } from "./error-screen";
import { PageSkeleton } from "./skeleton";

export type TokenResourceViewProps<T> = {
  /** 주소에서 받은 원본 토큰. */
  token: string | undefined;
  queryKey: QueryKey;
  fetcher: (token: string, signal: AbortSignal) => Promise<T>;
  children: (resource: T) => ReactNode;
};

/**
 * 로그인 없이 링크 토큰으로 여는 화면의 공통 골격이다.
 * 형식이 틀린 토큰과 서버가 찾지 못한 토큰은 구분하지 않고 같은 "찾을 수 없음"으로 보여준다.
 */
export function TokenResourceView<T>({
  token,
  queryKey,
  fetcher,
  children,
}: TokenResourceViewProps<T>) {
  const normalized = normalizeLinkToken(token);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetcher(normalized ?? "", signal),
    enabled: normalized !== null,
    retry: false,
  });

  if (normalized === null) {
    return (
      <ErrorScreen
        kind="not-found"
        title="링크를 열 수 없습니다"
        description="링크가 잘못되었거나 만료되었습니다. 받은 링크를 다시 확인해 주세요."
      />
    );
  }
  if (query.isPending) return <PageSkeleton />;
  if (query.isError) {
    const error = query.error;
    return (
      <ErrorScreen
        kind={toErrorScreenKind(error)}
        title={
          error instanceof ApiError && error.status === 404 ? "링크를 열 수 없습니다" : undefined
        }
        description={
          error instanceof ApiError && error.status === 404
            ? "링크가 잘못되었거나 만료되었습니다. 받은 링크를 다시 확인해 주세요."
            : undefined
        }
        traceId={error instanceof ApiError ? error.traceId : undefined}
        retryAfterSeconds={error instanceof ApiError ? error.retryAfterSeconds : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return children(query.data);
}
