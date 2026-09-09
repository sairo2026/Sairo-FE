import type { Metadata } from "next";
import { HomeDashboard } from "@/features/home";
import { AuthenticatedOfficeShell } from "@/features/auth/components/session-routing-guard";

export const metadata: Metadata = { title: "홈 | 사이로" };

export default function HomePage() {
  return (
    <AuthenticatedOfficeShell active="home">
      <HomeDashboard />
    </AuthenticatedOfficeShell>
  );
}
