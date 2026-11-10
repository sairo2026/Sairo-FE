import type { Metadata } from "next";
import { Suspense } from "react";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { SettlementScreen } from "@/features/settlement/components/settlement-screen";

export const metadata: Metadata = { title: "월말결산 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="settlements">
      <Suspense>
        <SettlementScreen />
      </Suspense>
    </OfficeAccessShell>
  );
}
