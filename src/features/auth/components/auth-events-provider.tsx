"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  setStepUpHandler,
  subscribeApiAuthEvents,
  subscribeStepUpCompleted,
} from "@/shared/api/auth-events";
import { OpsStepUpDialog } from "@/features/ops/components/common/ops-step-up-dialog";
import { authContextQueryKey, operatorQueryKey } from "../hooks/use-auth-context";
import { AUTH_ROUTES } from "../model/routes";
import { SessionExpiredDialog } from "./session-expired-dialog";
import { StepUpDialog } from "./step-up-dialog";

function isOpsPath(pathname: string): boolean {
  return pathname === "/ops" || pathname.startsWith("/ops/");
}

type StepUpRequest = { resolve: (isSuccess: boolean) => void };

/**
 * API client가 알리는 세션 만료, 재동의 필요, 재인증 필요를 한곳에서 받아 처리한다.
 * 세션 만료는 로그인 중이던 사용자에게만 대화상자를 보이고 그렇지 않으면 로그인 화면으로 보낸다.
 */
export function AuthEventsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [stepUp, setStepUp] = useState<StepUpRequest | null>(null);
  const [hasStepUpNotice, setHasStepUpNotice] = useState(false);
  const pendingStepUp = useRef<Promise<boolean> | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    return subscribeApiAuthEvents((event) => {
      const isOps = isOpsPath(pathnameRef.current);
      if (event.type === "session-expired") {
        const wasSignedIn =
          queryClient.getQueryData(isOps ? operatorQueryKey : authContextQueryKey) !== undefined;
        if (wasSignedIn) setIsSessionExpired(true);
        else router.replace(isOps ? AUTH_ROUTES.opsLogin : AUTH_ROUTES.login);
        return;
      }
      if (isOps) return;
      void queryClient.invalidateQueries({ queryKey: authContextQueryKey });
      if (pathnameRef.current !== AUTH_ROUTES.reconsent) router.replace(AUTH_ROUTES.reconsent);
    });
  }, [queryClient, router]);

  useEffect(() => {
    setStepUpHandler(() => {
      if (pendingStepUp.current) return pendingStepUp.current;
      const promise = new Promise<boolean>((resolve) => {
        setStepUp({ resolve });
      }).finally(() => {
        pendingStepUp.current = null;
      });
      pendingStepUp.current = promise;
      return promise;
    });
    return () => setStepUpHandler(null);
  }, []);

  useEffect(() => subscribeStepUpCompleted(() => setHasStepUpNotice(true)), []);

  const finishStepUp = useCallback(
    (isSuccess: boolean) => {
      stepUp?.resolve(isSuccess);
      setStepUp(null);
    },
    [stepUp],
  );

  const confirmSessionExpired = useCallback(() => {
    setIsSessionExpired(false);
    queryClient.clear();
    router.replace(isOpsPath(pathnameRef.current) ? AUTH_ROUTES.opsLogin : AUTH_ROUTES.login);
  }, [queryClient, router]);

  return (
    <>
      {children}
      {isSessionExpired ? <SessionExpiredDialog onConfirm={confirmSessionExpired} /> : null}
      {hasStepUpNotice ? (
        <div
          role="status"
          className="fixed right-4 bottom-4 left-4 z-[60] flex items-center justify-between gap-3 rounded-control border border-tag-green bg-tag-green px-4 py-3 text-caption font-medium text-tag-green-ink shadow-popup sm:left-auto"
        >
          <span>카카오로 본인 확인을 마쳤습니다. 10분 안에 하던 작업을 다시 진행해 주세요.</span>
          <button
            type="button"
            aria-label="본인 확인 알림 닫기"
            onClick={() => setHasStepUpNotice(false)}
            className="flex size-6 shrink-0 items-center justify-center text-current"
          >
            ×
          </button>
        </div>
      ) : null}
      {stepUp && isOpsPath(pathname) ? (
        <OpsStepUpDialog
          onSuccess={() => finishStepUp(true)}
          onCancel={() => finishStepUp(false)}
        />
      ) : null}
      {stepUp && !isOpsPath(pathname) ? (
        <StepUpDialog onSuccess={() => finishStepUp(true)} onCancel={() => finishStepUp(false)} />
      ) : null}
    </>
  );
}
