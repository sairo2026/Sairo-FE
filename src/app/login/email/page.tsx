import type { Metadata } from "next";
import { EmailLoginForm } from "@/features/auth/components/email-login-form";
import { safeNextPath } from "@/features/auth/model/landing";

export const metadata: Metadata = { title: "이메일 로그인 | 사이로" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function EmailLoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return <EmailLoginForm next={safeNextPath(next) ?? undefined} />;
}
