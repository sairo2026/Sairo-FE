import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CrossOfficeScreen } from "@/features/visit/components/cross-office-screen";

export const metadata: Metadata = { title: "다른 사무소 신청 현황 | 사이로" };

export default async function Page({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const id = Number(propertyId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return (
    <OfficeAccessShell activeKey="properties">
      <CrossOfficeScreen propertyId={id} />
    </OfficeAccessShell>
  );
}
