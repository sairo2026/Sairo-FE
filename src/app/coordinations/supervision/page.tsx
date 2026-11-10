import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { SupervisionScreen } from "@/features/visit/components/supervision-screen";

export const metadata: Metadata = { title: "보조원 고지 감독 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="coordinations">
      <SupervisionScreen />
    </OfficeAccessShell>
  );
}
