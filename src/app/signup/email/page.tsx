import type { Metadata } from "next";
import { SignupEmailFlow } from "@/features/auth/components/signup-email-flow";

export const metadata: Metadata = { title: "이메일 가입 | 사이로" };

export default function SignupEmailPage() {
  return <SignupEmailFlow />;
}
