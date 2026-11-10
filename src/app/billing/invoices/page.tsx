import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { InvoicesScreen } from "@/features/billing/components/invoices-screen";

export const metadata: Metadata = { title: "결제 내역 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <InvoicesScreen />
    </OfficeAccessShell>
  );
}
