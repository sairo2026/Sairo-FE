import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { KakaoLinkCallback } from "@/features/auth/components/login-methods-screen";

export const metadata: Metadata = { title: "카카오 연결 | 사이로", referrer: "no-referrer" };

type Props = { searchParams: Promise<{ code?: string; state?: string; error?: string }> };

export default async function Page({ searchParams }: Props) {
  const { code, state, error } = await searchParams;
  return (
    <AccountScreenFrame>
      <KakaoLinkCallback code={code ?? null} state={state ?? null} hasError={error !== undefined} />
    </AccountScreenFrame>
  );
}
