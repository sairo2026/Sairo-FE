import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { PromotionPeriodsScreen } from "@/features/billing/components/promotion-periods-screen";

export const metadata: Metadata = { title: "무료 프로모션 이용내역" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <PromotionPeriodsScreen />
    </OfficeAccessShell>
  );
}
