import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { BillingPlansScreen } from "@/features/billing/components/billing-plans-screen";

export const metadata: Metadata = { title: "요금제 안내 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <BillingPlansScreen />
    </OfficeAccessShell>
  );
}
