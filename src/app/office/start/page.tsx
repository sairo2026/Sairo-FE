import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { OfficeStartScreen } from "@/features/office/components/office-start-screen";

export const metadata: Metadata = { title: "사무소 생성·참여 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <OfficeStartScreen />
    </AccountScreenFrame>
  );
}
