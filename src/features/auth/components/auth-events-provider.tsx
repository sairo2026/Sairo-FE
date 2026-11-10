"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { setStepUpHandler, subscribeApiAuthEvents } from "@/shared/api/auth-events";
import { authContextQueryKey } from "../hooks/use-auth-context";
import { AUTH_ROUTES } from "../model/routes";
import { SessionExpiredDialog } from "./session-expired-dialog";
import { StepUpDialog } from "./step-up-dialog";

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
  const pendingStepUp = useRef<Promise<boolean> | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    return subscribeApiAuthEvents((event) => {
      if (event.type === "session-expired") {
        const wasSignedIn = queryClient.getQueryData(authContextQueryKey) !== undefined;
        if (wasSignedIn) setIsSessionExpired(true);
        else router.replace(AUTH_ROUTES.login);
        return;
      }
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
    router.replace(AUTH_ROUTES.login);
  }, [queryClient, router]);

  return (
    <>
      {children}
      {isSessionExpired ? <SessionExpiredDialog onConfirm={confirmSessionExpired} /> : null}
      {stepUp ? (
        <StepUpDialog onSuccess={() => finishStepUp(true)} onCancel={() => finishStepUp(false)} />
      ) : null}
    </>
  );
}
