import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { RefundDetailScreen } from "@/features/billing/components/refunds-screen";

export const metadata: Metadata = { title: "환불 처리 상태 | 사이로" };

export default async function Page({ params }: { params: Promise<{ refundId: string }> }) {
  const { refundId } = await params;
  return (
    <OfficeAccessShell activeKey="billing">
      <RefundDetailScreen refundId={Number(refundId)} />
    </OfficeAccessShell>
  );
}
