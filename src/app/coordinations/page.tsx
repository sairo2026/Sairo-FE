import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CoordinationListScreen } from "@/features/visit/components/coordination-list-screen";

export const metadata: Metadata = { title: "방문 조율 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="coordinations">
      <CoordinationListScreen />
    </OfficeAccessShell>
  );
}
