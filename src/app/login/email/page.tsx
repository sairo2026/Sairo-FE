import type { Metadata } from "next";
import { EmailLoginForm } from "@/features/auth/components/email-login-form";
import { SignedInRedirect } from "@/features/auth/components/signed-in-redirect";
import { safeNextPath } from "@/features/auth/model/landing";

export const metadata: Metadata = { title: "이메일 로그인" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function EmailLoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(next) ?? undefined;
  return (
    <>
      <SignedInRedirect next={safeNext} />
      <EmailLoginForm next={safeNext} />
    </>
  );
}
