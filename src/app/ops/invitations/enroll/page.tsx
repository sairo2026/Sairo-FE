import type { Metadata } from "next";
import { InvitationEnrollScreen } from "@/features/ops/auth/components/invitation-enroll-screen";

export const metadata: Metadata = { title: "운영자 인증 앱 등록 | 사이로" };

export default function OpsInvitationEnrollPage() {
  return <InvitationEnrollScreen />;
}
