import type { Metadata } from "next";
import { Suspense } from "react";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CardResultRoute } from "@/features/billing/components/card-result-route";

export const metadata: Metadata = { title: "카드 등록 결과 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <Suspense>
        <CardResultRoute />
      </Suspense>
    </OfficeAccessShell>
  );
}
