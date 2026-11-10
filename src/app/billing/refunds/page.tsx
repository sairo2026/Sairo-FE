import type { Metadata } from "next";
import { Suspense } from "react";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { RefundsRoute } from "@/features/billing/components/refunds-route";

export const metadata: Metadata = { title: "환불 신청 내역 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <Suspense>
        <RefundsRoute />
      </Suspense>
    </OfficeAccessShell>
  );
}
