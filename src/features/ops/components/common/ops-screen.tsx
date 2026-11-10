"use client";

import type { ReactNode } from "react";
import { PageHeader } from "@/shared/components/ui/page-header";
import type { OpsRole } from "../../model/roles";
import { OpsRoleGate } from "./ops-role-gate";

/** 운영 화면의 공통 틀: 제목 영역과 역할 가드를 함께 둔다. */
export function OpsScreen({
  title,
  description,
  roles,
  actions,
  children,
}: {
  title: string;
  description?: string;
  roles: readonly OpsRole[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <OpsRoleGate roles={roles}>
      <PageHeader title={title} description={description} actions={actions} />
      <div className="flex flex-col gap-6">{children}</div>
    </OpsRoleGate>
  );
}
