import type { Metadata } from "next";
import { CoordinationList } from "@/features/coordination";
import { AuthenticatedOfficeShell } from "@/features/auth/components/session-routing-guard";

export const metadata: Metadata = { title: "임장 조율 | 사이로" };

export default function CoordinationsPage() {
  return (
    <AuthenticatedOfficeShell active="coordinations">
      <CoordinationList />
    </AuthenticatedOfficeShell>
  );
}
