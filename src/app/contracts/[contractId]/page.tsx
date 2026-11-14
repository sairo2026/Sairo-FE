import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ContractDetailScreen } from "@/features/contract/components/contract-detail-screen";

export const metadata: Metadata = { title: "계약 상세 | 사이로" };

export default async function Page({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const id = Number(contractId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <OfficeAccessShell activeKey="contracts">
      <ContractDetailScreen contractId={id} />
    </OfficeAccessShell>
  );
}
