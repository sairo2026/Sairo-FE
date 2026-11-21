"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { z } from "zod";
import { operatorQueryKey } from "@/features/auth/hooks/use-auth-context";
import { AUTH_ROUTES } from "@/features/auth/model/routes";
import { apiFetch } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { OpsLayout } from "@/shared/layouts/layouts";
import { activeMenuKey, requiredRolesFor, visibleMenu } from "../model/menu";
import { useOpsSession } from "../model/ops-session";
import { OPS_ROLE_LABELS, hasAnyRole } from "../model/roles";
import { OpsForbiddenNotice } from "./common/ops-role-gate";

function logoutOperator() {
  return apiFetch<void>("/api/ops/auth/logout", {
    method: "POST",
    schema: z.void(),
    skipAuthEvents: true,
    skipStepUp: true,
  });
}

/** 운영 콘솔의 공통 틀. 보유 역할에 맞는 메뉴만 보이고 상단에 운영자 이름과 역할, 로그아웃을 둔다. */
export function OpsConsoleShell({ children }: { children: ReactNode }) {
  const session = useOpsSession();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await logoutOperator();
    } finally {
      queryClient.removeQueries({ queryKey: operatorQueryKey });
      queryClient.clear();
      router.replace(AUTH_ROUTES.opsLogin);
    }
  }

  const requiredRoles = requiredRolesFor(pathname);

  return (
    <OpsLayout
      navItems={visibleMenu(session.roles)}
      activeKey={activeMenuKey(pathname)}
      headerRight={
        <>
          <span className="min-w-0 wrap-anywhere">
            {session.name}
            {session.roles.length > 0
              ? ` · ${session.roles.map((role) => OPS_ROLE_LABELS[role]).join(", ")}`
              : ""}
          </span>
          <Button
            className="shrink-0"
            variant="outlined"
            size="sm"
            isLoading={isLoggingOut}
            onClick={() => void logout()}
          >
            로그아웃
          </Button>
        </>
      }
    >
      {/* 화면이 열리기 전에 막아 역할 없는 운영자의 업무 API 호출이 나가지 않게 한다. */}
      {hasAnyRole(session.roles, requiredRoles) ? (
        children
      ) : (
        <OpsForbiddenNotice roles={requiredRoles} />
      )}
    </OpsLayout>
  );
}
