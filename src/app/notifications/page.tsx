import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { NotificationListScreen } from "@/features/home/components/notification-list-screen";
import { parseNotificationTab } from "@/features/home/model/labels";

export const metadata: Metadata = { title: "알림함" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <OfficeAccessShell activeKey="home">
      <NotificationListScreen initialTab={parseNotificationTab(query.tab)} />
    </OfficeAccessShell>
  );
}
