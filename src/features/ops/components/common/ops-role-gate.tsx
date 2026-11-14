"use client";

import type { ReactNode } from "react";
import { OPS_ROLE_LABELS } from "../../model/roles";
import type { OpsRole } from "../../model/roles";
import { useHasOpsRole } from "../../model/ops-session";

export function OpsForbiddenNotice({ roles }: { roles: readonly OpsRole[] }) {
  return (
    <section role="alert" className="rounded-card-flat border border-line bg-white px-6 py-10">
      <h2 className="text-h2 font-semibold text-ink">이 화면을 볼 수 있는 운영 역할이 아닙니다</h2>
      {roles.length > 0 ? (
        <p className="mt-2 text-body text-ink-2">
          필요한 역할: {roles.map((role) => OPS_ROLE_LABELS[role]).join(", ")}
        </p>
      ) : null}
      <p className="mt-1 text-body text-ink-2">역할 변경은 보안관리자에게 요청해 주세요.</p>
    </section>
  );
}

/** 필요한 역할이 없으면 화면 대신 접근 불가 안내를 보인다. roles가 비어 있으면 운영자 누구나 연다. */
export function OpsRoleGate({
  roles,
  children,
}: {
  roles: readonly OpsRole[];
  children: ReactNode;
}) {
  const isAllowed = useHasOpsRole(roles);
  if (!isAllowed) return <OpsForbiddenNotice roles={roles} />;
  return <>{children}</>;
}
