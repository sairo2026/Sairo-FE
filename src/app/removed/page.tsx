import type { Metadata } from "next";
import { AccessNoticeScreen } from "@/features/auth/components/access-notice-screen";

export const metadata: Metadata = { title: "소속 해제 안내 | 사이로" };

export default function Page() {
  return <AccessNoticeScreen />;
}
