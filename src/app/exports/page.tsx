import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ExportsScreen } from "@/features/migration/components/exports-screen";

export const metadata: Metadata = { title: "데이터 내보내기 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="exports">
      <ExportsScreen />
    </OfficeAccessShell>
  );
}
