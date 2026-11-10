import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ReceivedGrantsScreen } from "@/features/visit/components/received-grants-screen";

export const metadata: Metadata = { title: "허용받은 매물 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="coordinations">
      <ReceivedGrantsScreen />
    </OfficeAccessShell>
  );
}
