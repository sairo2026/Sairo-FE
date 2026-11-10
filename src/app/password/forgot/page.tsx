import type { Metadata } from "next";
import { PasswordResetRequestForm } from "@/features/auth/components/password-recovery";

export const metadata: Metadata = { title: "비밀번호 찾기 | 사이로" };

export default function PasswordForgotPage() {
  return <PasswordResetRequestForm />;
}
