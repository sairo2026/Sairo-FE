import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { WithdrawalScreen } from "@/features/auth/components/withdrawal-screen";

export const metadata: Metadata = { title: "회원 탈퇴 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <WithdrawalScreen />
    </AccountScreenFrame>
  );
}
