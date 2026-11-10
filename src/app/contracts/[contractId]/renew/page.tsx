import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ContractRenewScreen } from "@/features/contract/components/contract-renew-screen";

export const metadata: Metadata = { title: "재계약 | 사이로" };

export default async function Page({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const id = Number(contractId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <OfficeAccessShell activeKey="contracts">
      <ContractRenewScreen contractId={id} />
    </OfficeAccessShell>
  );
}
