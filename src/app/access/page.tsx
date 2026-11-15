import type { Metadata } from "next";
import { AccessNoticeScreen } from "@/features/auth/components/access-notice-screen";

export const metadata: Metadata = { title: "접근 안내" };

export default function AccessNoticePage() {
  return <AccessNoticeScreen />;
}
