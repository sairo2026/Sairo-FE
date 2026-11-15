import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { RequestStatusScreen } from "@/features/visit/components/request-status-screen";

export const metadata: Metadata = { title: "방문 신청 현황" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ coordinationId: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { coordinationId } = await params;
  const query = await searchParams;
  const id = Number(coordinationId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const status = Array.isArray(query.status) ? query.status[0] : query.status;
  return (
    <OfficeAccessShell activeKey="coordinations">
      <RequestStatusScreen key={status ?? ""} coordinationId={id} initialStatus={status} />
    </OfficeAccessShell>
  );
}
