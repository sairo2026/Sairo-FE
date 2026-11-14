import type { Metadata } from "next";
import { PasswordResetForm } from "@/features/auth/components/password-recovery";
import { normalizeLinkToken } from "@/shared/lib/link-token";

export const metadata: Metadata = { title: "비밀번호 재설정 | 사이로", referrer: "no-referrer" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function Page({ searchParams }: Props) {
  const { token } = await searchParams;
  return <PasswordResetForm token={normalizeLinkToken(token)} />;
}
