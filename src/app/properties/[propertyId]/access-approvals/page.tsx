import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { AccessApprovalScreen } from "@/features/visit/components/access-approval-screen";

export const metadata: Metadata = { title: "출입승인 | 사이로" };

export default async function Page({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const id = Number(propertyId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return (
    <OfficeAccessShell activeKey="properties">
      <AccessApprovalScreen propertyId={id} />
    </OfficeAccessShell>
  );
}
