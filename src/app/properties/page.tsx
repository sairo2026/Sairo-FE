import type { Metadata } from "next";
import { PropertyList } from "@/features/property";
import { OfficeShell } from "@/shared/components/office-shell";

export const metadata: Metadata = { title: "매물 관리 | 사이로" };
export default function PropertiesPage() {
  return (
    <OfficeShell active="properties">
      <PropertyList />
    </OfficeShell>
  );
}
