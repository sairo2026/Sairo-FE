import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CustomerListScreen } from "@/features/customer/components/customer-list-screen";

export const metadata: Metadata = { title: "고객 관리 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="customers">
      <CustomerListScreen />
    </OfficeAccessShell>
  );
}
