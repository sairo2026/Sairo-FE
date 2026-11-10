import type { Metadata } from "next";
import { AuthEntry } from "@/features/auth/components/auth-entry";

export const metadata: Metadata = { title: "회원가입 | 사이로" };

export default function SignupPage() {
  return <AuthEntry mode="signup" />;
}
