import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CardScreen } from "@/features/billing/components/card-screen";

export const metadata: Metadata = { title: "카드 등록 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <CardScreen />
    </OfficeAccessShell>
  );
}
