import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { PromotionStatementScreen } from "@/features/billing/components/promotion-statement-screen";

export const metadata: Metadata = { title: "무료 프로모션 이용내역서" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <OfficeAccessShell activeKey="billing">
      <PromotionStatementScreen id={Number(id)} />
    </OfficeAccessShell>
  );
}
