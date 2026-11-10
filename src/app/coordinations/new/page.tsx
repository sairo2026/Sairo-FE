import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CoordinationCreateScreen } from "@/features/visit/components/coordination-create-screen";

export const metadata: Metadata = { title: "조율 만들기 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="coordinations">
      <CoordinationCreateScreen />
    </OfficeAccessShell>
  );
}
