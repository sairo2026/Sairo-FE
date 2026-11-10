import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { StartAgreementScreen } from "@/features/billing/components/agreement-notices-screens";

export const metadata: Metadata = { title: "시작 고객 합의 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <StartAgreementScreen />
    </OfficeAccessShell>
  );
}
