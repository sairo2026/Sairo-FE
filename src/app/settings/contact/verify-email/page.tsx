import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { ContactEmailVerify } from "@/features/auth/components/contact-change-screen";
import { normalizeLinkToken } from "@/shared/lib/link-token";

export const metadata: Metadata = { title: "이메일 변경 확인 | 사이로", referrer: "no-referrer" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function Page({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <AccountScreenFrame>
      <ContactEmailVerify token={normalizeLinkToken(token)} />
    </AccountScreenFrame>
  );
}
