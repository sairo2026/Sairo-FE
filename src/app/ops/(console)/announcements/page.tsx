import type { Metadata } from "next";
import { AnnouncementsScreen } from "@/features/ops/announcements/announcements-screen";

export const metadata: Metadata = { title: "공지 관리 | 사이로 운영" };

export default function Page() {
  return <AnnouncementsScreen />;
}
