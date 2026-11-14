import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CustomerMergeScreen } from "@/features/customer/components/customer-merge-screen";

export const metadata: Metadata = { title: "고객 병합 | 사이로" };

function parseId(value: string | string[] | undefined): number {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(id) && id >= 1 ? id : 0;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ primary?: string | string[]; merged?: string | string[] }>;
}) {
  const query = await searchParams;
  const primaryId = parseId(query.primary);
  const mergedId = parseId(query.merged);
  if (primaryId === 0 || mergedId === 0) notFound();
  return (
    <OfficeAccessShell activeKey="customers">
      <CustomerMergeScreen primaryId={primaryId} mergedId={mergedId} />
    </OfficeAccessShell>
  );
}
