"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/api/client";
import { OfficeShell } from "@/shared/components/office-shell";
import type { OfficeShellProps } from "@/shared/components/office-shell";
import type { ReactNode } from "react";
import { checkSession } from "../api/session.api";

export function SessionRoutingGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  useEffect(() => {
    let isActive = true;

    checkSession()
      .then(() => {
        if (isActive) setIsSessionChecked(true);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
          return;
        }
        setIsSessionChecked(true);
      });

    return () => {
      isActive = false;
    };
  }, [router]);

  if (!isSessionChecked) {
    return (
      <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-white p-10 shadow-sm">
          <div
            aria-hidden
            className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#3937b8]"
          />
          <p className="text-sm text-slate-500">로그인 상태를 확인하는 중입니다.</p>
        </div>
      </main>
    );
  }

  return children;
}

export function AuthenticatedOfficeShell({ children, active }: OfficeShellProps) {
  return (
    <SessionRoutingGuard>
      <OfficeShell active={active}>{children}</OfficeShell>
    </SessionRoutingGuard>
  );
}
