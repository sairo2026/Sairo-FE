import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ImportBatchScreen } from "@/features/migration/components/import-batch-screen";

export const metadata: Metadata = { title: "데이터 이전 진행 | 사이로" };

export default async function Page({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const id = Number(batchId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <OfficeAccessShell activeKey="import">
      <ImportBatchScreen batchId={id} />
    </OfficeAccessShell>
  );
}
