import type { Metadata } from "next";
import { Suspense } from "react";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ContractCreateRoute } from "@/features/contract/components/contract-create-route";

export const metadata: Metadata = { title: "계약 등록 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="contracts">
      <Suspense>
        <ContractCreateRoute />
      </Suspense>
    </OfficeAccessShell>
  );
}
