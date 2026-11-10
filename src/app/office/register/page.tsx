import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { OfficeRegistrationForm } from "@/features/office/components/office-registration-form";

export const metadata: Metadata = { title: "사무소 등록 신청 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <OfficeRegistrationForm />
    </AccountScreenFrame>
  );
}
