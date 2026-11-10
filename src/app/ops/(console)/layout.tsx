"use client";

import type { ReactNode } from "react";
import { OpsAccessGate } from "@/features/auth/components/ops-access-gate";
import { OpsConsoleShell } from "@/features/ops/components/ops-console-shell";

/** 운영 콘솔은 사무소 화면과 별도 세션으로 가드한다. */
export default function OpsConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <OpsAccessGate>
      <OpsConsoleShell>{children}</OpsConsoleShell>
    </OpsAccessGate>
  );
}
