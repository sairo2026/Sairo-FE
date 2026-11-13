import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { HomeDashboard } from "@/features/home";

export const metadata: Metadata = { title: "홈 | 사이로" };

export default function HomePage() {
  return (
    <OfficeAccessShell activeKey="home">
      <HomeDashboard />
    </OfficeAccessShell>
  );
}
