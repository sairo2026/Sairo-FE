import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { PriceNoticesScreen } from "@/features/billing/components/agreement-notices-screens";

export const metadata: Metadata = { title: "가격 변경 안내 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <PriceNoticesScreen />
    </OfficeAccessShell>
  );
}
