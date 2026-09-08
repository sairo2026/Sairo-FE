import type { Metadata } from "next";
import { PropertyForm } from "@/features/property";
import { OfficeShell } from "@/shared/components/office-shell";

export const metadata: Metadata = { title: "매물 등록 | 사이로" };
export default function NewPropertyPage() {
  return (
    <OfficeShell active="properties">
      <PropertyForm mode="create" />
    </OfficeShell>
  );
}
