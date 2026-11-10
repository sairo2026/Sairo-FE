import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { MembershipStatusScreen } from "@/features/office/components/membership-screens";

export const metadata: Metadata = { title: "참여 요청 상태 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <MembershipStatusScreen />
    </AccountScreenFrame>
  );
}
