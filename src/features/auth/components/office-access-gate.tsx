"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { OfficeLayout } from "@/shared/layouts/layouts";
import { useAuthContext } from "../hooks/use-auth-context";
import { describeGrace } from "../model/access-notice";
import { decideAccess, isOfficeRole } from "../model/access-policy";
import { getOfficeMenu } from "../model/role-menu";
import { OfficeAccessProvider, useOfficeAccess } from "@/shared/session/office-access-context";

/** 접근 상태 판정 결과대로 화면을 보여주거나 안내 화면으로 보낸다. */
export function OfficeAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const query = useAuthContext();

  const isUnauthenticated = query.error instanceof ApiError && query.error.status === 401;
  const decision =
    query.isPending || (query.isError && !isUnauthenticated)
      ? null
      : decideAccess(isUnauthenticated ? null : (query.data ?? null), pathname);
  const redirectTarget = decision?.kind === "redirect" ? decision.to : null;

  useEffect(() => {
    if (redirectTarget !== null) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  if (query.isPending) return <PageSkeleton label="접근 상태를 확인하는 중입니다." />;
  if (query.isError && !isUnauthenticated) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(query.error)}
        traceId={query.error instanceof ApiError ? query.error.traceId : undefined}
        retryAfterSeconds={
          query.error instanceof ApiError ? query.error.retryAfterSeconds : undefined
        }
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (decision === null || decision.kind === "redirect") {
    return <PageSkeleton label="이동하는 중입니다." />;
  }
  if (decision.kind === "forbidden") return <ErrorScreen kind="forbidden" />;
  if (!query.data) return <PageSkeleton label="접근 상태를 확인하는 중입니다." />;

  const role = isOfficeRole(query.data.role) ? query.data.role : null;
  return (
    <OfficeAccessProvider value={{ context: query.data, role, isReadOnly: decision.isReadOnly }}>
      {children}
    </OfficeAccessProvider>
  );
}

/** 접근 판정 뒤 역할별 메뉴를 가진 사무소 화면 틀을 씌운다. */
export function OfficeAccessShell({
  children,
  activeKey,
}: {
  children: ReactNode;
  activeKey?: string;
}) {
  return (
    <OfficeAccessGate>
      <OfficeShellFrame activeKey={activeKey}>{children}</OfficeShellFrame>
    </OfficeAccessGate>
  );
}

function OfficeShellFrame({ children, activeKey }: { children: ReactNode; activeKey?: string }) {
  const { context, role, isReadOnly } = useOfficeAccess();
  const grace = describeGrace(context);
  const banner = isReadOnly
    ? "결제가 지연되어 읽기만 가능합니다. 대표가 결제를 마치면 다시 저장할 수 있습니다."
    : grace;
  return (
    <OfficeLayout
      activeKey={activeKey}
      navItems={role ? getOfficeMenu(role) : undefined}
      tone={activeKey === "home" ? "board" : "white"}
    >
      {banner ? (
        <p
          role="status"
          className="mb-6 rounded-control bg-primary-soft px-4 py-3 text-caption text-ink-2"
        >
          {banner}
        </p>
      ) : null}
      {children}
    </OfficeLayout>
  );
}
