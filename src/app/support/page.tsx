import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { SupportHubScreen } from "@/features/support/components/support-hub-screen";

export const metadata: Metadata = { title: "서비스 이용 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <SupportHubScreen />
    </AccountScreenFrame>
  );
}
