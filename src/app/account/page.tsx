import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { AccountScreen } from "@/features/settings/components/account-screen";

export const metadata: Metadata = { title: "내 계정 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <AccountScreen />
    </AccountScreenFrame>
  );
}
