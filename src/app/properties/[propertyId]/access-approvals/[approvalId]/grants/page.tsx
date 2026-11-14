import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ApplyGrantsScreen } from "@/features/visit/components/apply-grants-screen";

export const metadata: Metadata = { title: "신청 허용 관리 | 사이로" };

export default async function Page({
  params,
}: {
  params: Promise<{ propertyId: string; approvalId: string }>;
}) {
  const { propertyId, approvalId } = await params;
  const property = Number(propertyId);
  const approval = Number(approvalId);
  if (!Number.isSafeInteger(property) || property < 1) notFound();
  if (!Number.isSafeInteger(approval) || approval < 1) notFound();
  return (
    <OfficeAccessShell activeKey="properties">
      <ApplyGrantsScreen propertyId={property} approvalId={approval} />
    </OfficeAccessShell>
  );
}
