import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { InquiryNewScreen } from "@/features/support/components/inquiry-new-screen";

export const metadata: Metadata = { title: "문의하기 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <InquiryNewScreen />
    </AccountScreenFrame>
  );
}
