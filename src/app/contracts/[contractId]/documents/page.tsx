import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { DocumentScreen } from "@/features/contract/components/document-screen";

export const metadata: Metadata = { title: "서류 첨부 | 사이로" };

export default async function Page({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const id = Number(contractId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <OfficeAccessShell activeKey="contracts">
      <DocumentScreen contractId={id} />
    </OfficeAccessShell>
  );
}
