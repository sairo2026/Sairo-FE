import type { Metadata } from "next";
import { PropertyList } from "@/features/property";
import { AuthenticatedOfficeShell } from "@/features/auth/components/session-routing-guard";

export const metadata: Metadata = { title: "매물 관리 | 사이로" };
export default function PropertiesPage() {
  return (
    <AuthenticatedOfficeShell active="properties">
      <PropertyList />
    </AuthenticatedOfficeShell>
  );
}
