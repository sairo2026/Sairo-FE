import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { PropertyCreateScreen } from "@/features/property/components/property-form-screen";

export const metadata: Metadata = { title: "매물 등록" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="properties">
      <PropertyCreateScreen />
    </OfficeAccessShell>
  );
}
