import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { SupportRequestDetailScreen } from "@/features/migration/components/support-request-detail-screen";

export const metadata: Metadata = { title: "이전 지원 신청 | 사이로" };

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const id = Number(requestId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <OfficeAccessShell activeKey="import">
      <SupportRequestDetailScreen requestId={id} />
    </OfficeAccessShell>
  );
}
