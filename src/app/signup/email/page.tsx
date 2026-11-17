import type { Metadata } from "next";
import { SignedInRedirect } from "@/features/auth/components/signed-in-redirect";
import { SignupEmailFlow } from "@/features/auth/components/signup-email-flow";

export const metadata: Metadata = { title: "이메일 가입" };

export default function SignupEmailPage() {
  return (
    <>
      <SignedInRedirect />
      <SignupEmailFlow />
    </>
  );
}
