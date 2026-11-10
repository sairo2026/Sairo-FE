import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { MemberRequestsScreen } from "@/features/office/components/member-requests-screen";

export const metadata: Metadata = { title: "참여 요청·초대 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="office">
      <MemberRequestsScreen />
    </OfficeAccessShell>
  );
}
