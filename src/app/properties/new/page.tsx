import type { Metadata } from "next";
import { PropertyForm } from "@/features/property";
import { AuthenticatedOfficeShell } from "@/features/auth/components/session-routing-guard";

export const metadata: Metadata = { title: "매물 등록 | 사이로" };
export default function NewPropertyPage() {
  return (
    <AuthenticatedOfficeShell active="properties">
      <PropertyForm mode="create" />
    </AuthenticatedOfficeShell>
  );
}
