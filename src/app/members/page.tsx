import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { MembersScreen } from "@/features/office/components/members-screen";

export const metadata: Metadata = { title: "구성원 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="office">
      <MembersScreen />
    </OfficeAccessShell>
  );
}
