import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { PropertyListScreen } from "@/features/property/components/property-list-screen";

export const metadata: Metadata = { title: "매물 관리" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="properties">
      <PropertyListScreen />
    </OfficeAccessShell>
  );
}
