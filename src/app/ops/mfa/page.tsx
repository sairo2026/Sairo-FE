import type { Metadata } from "next";
import { OpsMfaScreen } from "@/features/ops/auth/components/ops-mfa-screen";

export const metadata: Metadata = { title: "운영자 2차 인증 | 사이로" };

export default function OpsMfaPage() {
  return <OpsMfaScreen />;
}
