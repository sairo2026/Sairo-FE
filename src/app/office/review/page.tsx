import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { OfficeReviewScreen } from "@/features/office/components/office-review-screen";

export const metadata: Metadata = { title: "사무소 인증 심사" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <OfficeReviewScreen />
    </AccountScreenFrame>
  );
}
