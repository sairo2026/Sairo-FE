"use client";

import type { ReactNode } from "react";
import { OpsAccessGate } from "@/features/auth/components/ops-access-gate";
import { OpsLayout } from "@/shared/layouts/layouts";

const OPS_NAV_ITEMS = [{ key: "home", label: "운영 홈", href: "/ops" }];

/** 운영 콘솔은 사무소 화면과 별도 세션으로 가드한다. */
export default function OpsConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <OpsAccessGate>
      <OpsLayout navItems={OPS_NAV_ITEMS} activeKey="home">
        {children}
      </OpsLayout>
    </OpsAccessGate>
  );
}
