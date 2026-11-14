import type { Metadata } from "next";
import { Suspense } from "react";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { SupportRequestsScreen } from "@/features/migration/components/support-requests-screen";

export const metadata: Metadata = { title: "유료 이전 지원 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="import">
      <Suspense>
        <SupportRequestsScreen />
      </Suspense>
    </OfficeAccessShell>
  );
}
