import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { TaxRecipientScreen } from "@/features/billing/components/tax-recipient-screen";

export const metadata: Metadata = { title: "세금계산서 수신 정보 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <TaxRecipientScreen />
    </OfficeAccessShell>
  );
}
