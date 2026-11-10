import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { NotificationListScreen } from "@/features/home/components/notification-list-screen";

export const metadata: Metadata = { title: "알림함 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="home">
      <NotificationListScreen />
    </OfficeAccessShell>
  );
}
