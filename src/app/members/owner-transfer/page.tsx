import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { OwnerTransferScreen } from "@/features/office/components/owner-transfer-screen";

export const metadata: Metadata = { title: "대표 이전 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="office">
      <OwnerTransferScreen />
    </OfficeAccessShell>
  );
}
