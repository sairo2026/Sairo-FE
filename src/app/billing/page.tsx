import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { SubscriptionScreen } from "@/features/billing/components/subscription-screen";

export const metadata: Metadata = { title: "구독·결제 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <SubscriptionScreen />
    </OfficeAccessShell>
  );
}
