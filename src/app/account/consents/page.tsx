import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { ConsentsScreen } from "@/features/settings/components/consents-screen";

export const metadata: Metadata = { title: "동의 내역 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <ConsentsScreen />
    </AccountScreenFrame>
  );
}
