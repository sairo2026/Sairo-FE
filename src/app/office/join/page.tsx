import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { OfficeSearchScreen } from "@/features/office/components/membership-screens";

export const metadata: Metadata = { title: "사무소 검색 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <OfficeSearchScreen />
    </AccountScreenFrame>
  );
}
