import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { RequestStatusScreen } from "@/features/visit/components/request-status-screen";

export const metadata: Metadata = { title: "방문 신청 현황 | 사이로" };

export default async function Page({ params }: { params: Promise<{ coordinationId: string }> }) {
  const { coordinationId } = await params;
  const id = Number(coordinationId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return (
    <OfficeAccessShell activeKey="coordinations">
      <RequestStatusScreen coordinationId={id} />
    </OfficeAccessShell>
  );
}
