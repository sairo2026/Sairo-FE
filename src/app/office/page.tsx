import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { OfficeInfoScreen } from "@/features/office/components/office-info-screen";

export const metadata: Metadata = { title: "사무소 관리 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="office">
      <OfficeInfoScreen />
    </OfficeAccessShell>
  );
}
