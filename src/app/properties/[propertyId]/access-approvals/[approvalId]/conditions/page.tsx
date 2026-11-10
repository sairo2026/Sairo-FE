import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ProxyConditionsScreen } from "@/features/visit/components/proxy-conditions-screen";

export const metadata: Metadata = { title: "승인자 조건 대리 입력 | 사이로" };

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
      <ProxyConditionsScreen propertyId={property} approvalId={approval} />
    </OfficeAccessShell>
  );
}
