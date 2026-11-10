import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { OfficeCloseScreen } from "@/features/settings/components/office-close-screen";

export const metadata: Metadata = { title: "사무소 종료 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="office">
      <OfficeCloseScreen />
    </OfficeAccessShell>
  );
}
