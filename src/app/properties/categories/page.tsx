import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CategoryManagementScreen } from "@/features/property/components/category-management-screen";

export const metadata: Metadata = { title: "카테고리 관리" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="properties">
      <CategoryManagementScreen />
    </OfficeAccessShell>
  );
}
