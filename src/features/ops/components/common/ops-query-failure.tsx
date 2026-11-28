import { ApiError } from "@/shared/api/api-error";
import { describeOpsError } from "../../model/ops-errors";

export function OpsSessionLoginLink() {
  return (
    <a
      href="/ops/login"
      className="inline-flex h-9 items-center rounded-control border border-line px-4 text-body font-semibold text-ink hover:bg-surface"
    >
      운영자 로그인
    </a>
  );
}

export function OpsQueryFailure({
  error,
  fallback,
  className = "",
}: {
  error: unknown;
  fallback: string;
  className?: string;
}) {
  const sessionExpired = error instanceof ApiError && error.isSessionExpired;
  return (
    <div role="alert" className={`flex flex-col items-start gap-2 text-body ${className}`}>
      <p>{sessionExpired ? describeOpsError(error, fallback) : fallback}</p>
      {sessionExpired ? <OpsSessionLoginLink /> : null}
    </div>
  );
}
