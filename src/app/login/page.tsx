import type { Metadata } from "next";
import { AuthEntry } from "@/features/auth/components/auth-entry";
import { safeNextPath } from "@/features/auth/model/landing";

export const metadata: Metadata = { title: "로그인 | 사이로" };

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;
  return <AuthEntry mode="login" errorCode={error} next={safeNextPath(next) ?? undefined} />;
}
