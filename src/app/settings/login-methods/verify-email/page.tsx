import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { LoginMethodEmailVerify } from "@/features/auth/components/login-methods-screen";
import { normalizeLinkToken } from "@/shared/lib/link-token";

export const metadata: Metadata = { title: "이메일 연결 | 사이로", referrer: "no-referrer" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function Page({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <AccountScreenFrame>
      <LoginMethodEmailVerify token={normalizeLinkToken(token)} />
    </AccountScreenFrame>
  );
}
