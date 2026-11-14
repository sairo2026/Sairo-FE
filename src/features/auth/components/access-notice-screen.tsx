"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { logout } from "../api/auth-context.api";
import { useAuthContext } from "../hooks/use-auth-context";
import { describeAccess } from "../model/access-notice";
import { AUTH_ROUTES } from "../model/routes";

function pickRedirectTarget(
  isUnauthenticated: boolean,
  isReconsentRequired: boolean,
  hasNothingToShow: boolean,
): string | null {
  if (isUnauthenticated) return AUTH_ROUTES.login;
  if (isReconsentRequired) return AUTH_ROUTES.reconsent;
  if (hasNothingToShow) return "/home";
  return null;
}

/** 접근 상태별로 지금 할 수 있는 동작을 안내한다. 접근 상태는 서버 판정 결과를 쓴다. */
export function AccessNoticeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useAuthContext();
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      router.replace(AUTH_ROUTES.login);
    },
  });

  const isUnauthenticated = query.error instanceof ApiError && query.error.status === 401;
  const notice = query.data ? describeAccess(query.data) : null;
  const redirectTarget = pickRedirectTarget(
    isUnauthenticated,
    query.data?.reconsentRequired === true,
    query.data !== undefined && notice === null,
  );

  useEffect(() => {
    if (redirectTarget !== null) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  if (query.isPending || redirectTarget !== null) {
    return <PageSkeleton label="접근 상태를 확인하는 중입니다." />;
  }
  if (query.isError || notice === null) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(query.error)}
        traceId={query.error instanceof ApiError ? query.error.traceId : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <Card>
        <h1 className="text-h1 font-bold text-ink">{notice.title}</h1>
        <p className="mt-3 text-body text-ink-2">{notice.description}</p>
        {notice.details.length > 0 ? (
          <ul className="mt-4 list-disc pl-5 text-caption text-ink-2">
            {notice.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          {notice.actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex h-12 items-center rounded-control border border-line px-6 font-medium text-ink-2 hover:border-primary hover:text-primary"
            >
              {action.label}
            </Link>
          ))}
          <Button
            variant="cancel"
            isLoading={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            로그아웃
          </Button>
        </div>
        {logoutMutation.isError ? (
          <p role="alert" className="mt-3 text-caption text-danger">
            로그아웃하지 못했습니다. 다시 시도해 주세요.
          </p>
        ) : null}
      </Card>
    </main>
  );
}
