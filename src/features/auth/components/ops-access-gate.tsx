"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { OpsSessionProvider } from "@/features/ops/model/ops-session";
import { toOpsRoles } from "@/features/ops/model/roles";
import { useOperatorMe } from "../hooks/use-auth-context";
import { decideOpsAccess } from "../model/access-policy";

/** 운영 콘솔(/ops)은 사무소 세션과 분리돼 있어 운영자 확인에 성공한 경우에만 연다. */
export function OpsAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const query = useOperatorMe();

  const isUnauthenticated = query.error instanceof ApiError && query.error.status === 401;
  const isForbidden = query.error instanceof ApiError && query.error.status === 403;
  const decision = decideOpsAccess(query.isSuccess);
  const to =
    (isUnauthenticated || isForbidden) && decision.kind === "redirect" ? decision.to : null;

  useEffect(() => {
    if (to !== null) router.replace(to);
  }, [to, router]);

  if (query.isPending || to !== null) return <PageSkeleton label="운영자 확인 중입니다." />;
  if (query.isError) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(query.error)}
        traceId={query.error instanceof ApiError ? query.error.traceId : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return (
    <OpsSessionProvider
      value={{
        operatorId: query.data.operatorId,
        name: query.data.name,
        roles: toOpsRoles(query.data.roles),
      }}
    >
      {children}
    </OpsSessionProvider>
  );
}
