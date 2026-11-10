import type { Metadata } from "next";
import { PrivacyQueueScreen } from "@/features/ops/privacy-requests/privacy-queue";

export const metadata: Metadata = { title: "개인정보 요청 | 사이로 운영" };

export default function Page() {
  return <PrivacyQueueScreen />;
}
