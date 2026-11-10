import type { Metadata } from "next";
import { Suspense } from "react";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ContractListScreen } from "@/features/contract/components/contract-list-screen";

export const metadata: Metadata = { title: "계약 관리 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="contracts">
      <Suspense>
        <ContractListScreen />
      </Suspense>
    </OfficeAccessShell>
  );
}
