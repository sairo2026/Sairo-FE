import type { Metadata } from "next";
import { AuthEntry } from "@/features/auth/components/auth-entry";
import { safeNextPath } from "@/features/auth/model/landing";
import { INDEXABLE_ROBOTS, publicPageSocialMetadata } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "로그인",
  description: "카카오 또는 이메일 계정으로 사이로에 로그인합니다.",
  robots: INDEXABLE_ROBOTS,
  ...publicPageSocialMetadata(
    "로그인",
    "카카오 또는 이메일 계정으로 사이로에 로그인합니다.",
    "/login",
  ),
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;
  return <AuthEntry mode="login" errorCode={error} next={safeNextPath(next) ?? undefined} />;
}
