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
    return <p className="p-8 text-slate-500">로그인 상태를 확인하는 중입니다.</p>;
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
