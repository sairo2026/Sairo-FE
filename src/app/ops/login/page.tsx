import type { Metadata } from "next";
import { OpsLoginScreen } from "@/features/ops/auth/components/ops-login-screen";

export const metadata: Metadata = { title: "운영자 로그인 | 사이로" };

type OpsLoginPageProps = {
  searchParams: Promise<{ error?: string; reason?: string }>;
};

export default async function OpsLoginPage({ searchParams }: OpsLoginPageProps) {
  const { error, reason } = await searchParams;
  return <OpsLoginScreen errorCode={error} reason={reason} />;
}
