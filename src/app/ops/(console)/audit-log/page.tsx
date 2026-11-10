import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditLogScreen } from "@/features/ops/operators/audit-log";

export const metadata: Metadata = { title: "감사 이력 | 사이로 운영" };

export default function Page() {
  return (
    <Suspense>
      <AuditLogScreen />
    </Suspense>
  );
}
