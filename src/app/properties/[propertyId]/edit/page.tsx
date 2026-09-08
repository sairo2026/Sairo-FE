import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropertyEditLoader } from "@/features/property";
import { OfficeShell } from "@/shared/components/office-shell";

export const metadata: Metadata = { title: "매물 정보 수정 | 사이로" };
export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const id = Number(propertyId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return (
    <OfficeShell active="properties">
      <PropertyEditLoader propertyId={id} />
    </OfficeShell>
  );
}
