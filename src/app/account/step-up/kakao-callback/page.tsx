import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { KakaoStepUpCallback } from "@/features/auth/components/kakao-step-up-callback";

export const metadata: Metadata = { title: "본인 확인 | 사이로", referrer: "no-referrer" };

type Props = { searchParams: Promise<{ code?: string; state?: string; error?: string }> };

export default async function Page({ searchParams }: Props) {
  const { code, state, error } = await searchParams;
  return (
    <AccountScreenFrame>
      <KakaoStepUpCallback
        code={code ?? null}
        state={state ?? null}
        hasError={error !== undefined}
      />
    </AccountScreenFrame>
  );
}
