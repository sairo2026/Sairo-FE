"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "./error-screen";
import { PageSkeleton } from "./skeleton";

export type QueryGateProps<T> = {
  query: UseQueryResult<T, unknown>;
  loadingLabel: string;
  children: (data: T) => ReactNode;
};

export function QueryGate<T>({ query, loadingLabel, children }: QueryGateProps<T>) {
  if (query.isPending) return <PageSkeleton label={loadingLabel} />;
  if (query.isError) {
    const error = query.error;
    return (
      <ErrorScreen
        kind={toErrorScreenKind(error)}
        traceId={error instanceof ApiError ? error.traceId : undefined}
        retryAfterSeconds={error instanceof ApiError ? error.retryAfterSeconds : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return <>{children(query.data)}</>;
}
