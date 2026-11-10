import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { PrivacyRequestsScreen } from "@/features/support/components/privacy-requests-screen";

export const metadata: Metadata = { title: "개인정보 권리 요청 | 사이로" };

export default function Page() {
  return (
    <AccountScreenFrame>
      <PrivacyRequestsScreen />
    </AccountScreenFrame>
  );
}
