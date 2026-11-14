import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { AuthSuspensionScreen } from "@/features/billing/components/auth-suspension-screen";

export const metadata: Metadata = { title: "인증 중단과 재개 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="billing">
      <AuthSuspensionScreen />
    </OfficeAccessShell>
  );
}
