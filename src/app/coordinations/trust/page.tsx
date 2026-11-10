import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { TrustSummaryScreen } from "@/features/visit/components/trust-summary-screen";

export const metadata: Metadata = { title: "신뢰 요약·받은 평가 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="coordinations">
      <TrustSummaryScreen />
    </OfficeAccessShell>
  );
}
