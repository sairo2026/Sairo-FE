import type { Metadata } from "next";
import { AuthEntry } from "@/features/auth/components/auth-entry";
import { INDEXABLE_ROBOTS, publicPageSocialMetadata } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "회원가입",
  description: "카카오 또는 이메일로 사이로 회원가입을 시작합니다.",
  robots: INDEXABLE_ROBOTS,
  ...publicPageSocialMetadata("회원가입", "카카오 또는 이메일로 사이로 회원가입을 시작합니다."),
};

export default function SignupPage() {
  return <AuthEntry mode="signup" />;
}
