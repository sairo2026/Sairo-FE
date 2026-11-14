import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { ContactChangeScreen } from "@/features/auth/components/contact-change-screen";

export const metadata: Metadata = { title: "이메일·휴대폰 변경 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <ContactChangeScreen />
    </AccountScreenFrame>
  );
}
