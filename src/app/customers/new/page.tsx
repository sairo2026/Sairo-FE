import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CustomerCreateScreen } from "@/features/customer/components/customer-form-screen";

export const metadata: Metadata = { title: "고객 등록 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="customers">
      <CustomerCreateScreen />
    </OfficeAccessShell>
  );
}
