import type { Metadata } from "next";
import { KakaoSignupForm } from "@/features/auth/components/kakao-signup-form";

export const metadata: Metadata = { title: "카카오 가입 | 사이로" };

export default function SignupKakaoPage() {
  return <KakaoSignupForm />;
}
