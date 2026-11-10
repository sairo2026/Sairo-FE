import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { InvoiceDetailScreen } from "@/features/billing/components/invoice-detail-screen";

export const metadata: Metadata = { title: "결제 내역 상세 | 사이로" };

export default async function Page({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  return (
    <OfficeAccessShell activeKey="billing">
      <InvoiceDetailScreen invoiceId={Number(invoiceId)} />
    </OfficeAccessShell>
  );
}
