import type { Metadata } from "next";
import { Suspense } from "react";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ConsentRoute } from "@/features/billing/components/consent-route";

export const metadata: Metadata = { title: "구독 구매 동의 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <Suspense>
        <ConsentRoute />
      </Suspense>
    </OfficeAccessShell>
  );
}
