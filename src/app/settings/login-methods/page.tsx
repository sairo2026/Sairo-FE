import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { LoginMethodsScreen } from "@/features/auth/components/login-methods-screen";

export const metadata: Metadata = { title: "로그인 방식 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <LoginMethodsScreen />
    </AccountScreenFrame>
  );
}
