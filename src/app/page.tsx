import type { Metadata } from "next";
import { HomeDashboard } from "@/features/home";
import { OfficeShell } from "@/shared/components/office-shell";

export const metadata: Metadata = { title: "홈 | 사이로" };

export default function HomePage() {
  return (
    <OfficeShell active="home">
      <HomeDashboard />
    </OfficeShell>
  );
}
