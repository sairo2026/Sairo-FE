import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { KakaoStepUpCallback } from "@/features/auth/components/kakao-step-up-callback";

export const metadata: Metadata = { title: "본인 확인 | 사이로", referrer: "no-referrer" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function Page({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <AccountScreenFrame>
      <KakaoStepUpCallback error={error ?? null} />
    </AccountScreenFrame>
  );
}
