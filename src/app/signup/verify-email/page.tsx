import type { Metadata } from "next";
import { SignupEmailFlow } from "@/features/auth/components/signup-email-flow";
import { normalizeLinkToken } from "@/shared/lib/link-token";

export const metadata: Metadata = { title: "이메일 인증", referrer: "no-referrer" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function Page({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <div data-public-contrast className="contents">
      <SignupEmailFlow token={normalizeLinkToken(token) ?? undefined} />
    </div>
  );
}
