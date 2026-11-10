import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ContractDraftEditScreen } from "@/features/contract/components/contract-form-screen";

export const metadata: Metadata = { title: "계약 초안 수정 | 사이로" };

export default async function Page({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const id = Number(contractId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <OfficeAccessShell activeKey="contracts">
      <ContractDraftEditScreen contractId={id} />
    </OfficeAccessShell>
  );
}
