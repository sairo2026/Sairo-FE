import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ReturnGuideScreen } from "@/features/billing/components/auth-suspension-screen";

export const metadata: Metadata = { title: "자료 반환과 보관 안내 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <ReturnGuideScreen />
    </OfficeAccessShell>
  );
}
