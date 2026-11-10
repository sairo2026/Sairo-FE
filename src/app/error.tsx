"use client";

import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      kind={toErrorScreenKind(error)}
      traceId={error instanceof ApiError ? error.traceId : (error.digest ?? undefined)}
      retryAfterSeconds={error instanceof ApiError ? error.retryAfterSeconds : undefined}
      onRetry={reset}
    />
  );
}
