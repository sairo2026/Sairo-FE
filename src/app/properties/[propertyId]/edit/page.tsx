import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { PropertyEditScreen } from "@/features/property/components/property-form-screen";

export const metadata: Metadata = { title: "매물 수정 | 사이로" };

export default async function Page({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const id = Number(propertyId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return (
    <OfficeAccessShell activeKey="properties">
      <PropertyEditScreen propertyId={id} />
    </OfficeAccessShell>
  );
}
