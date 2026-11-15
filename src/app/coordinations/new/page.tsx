import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CoordinationCreateScreen } from "@/features/visit/components/coordination-create-screen";
import { parseIdParam } from "@/features/visit/model/visit-routes";

export const metadata: Metadata = { title: "조율 만들기 | 사이로" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string | string[]; customerId?: string | string[] }>;
}) {
  const query = await searchParams;
  const propertyId = parseIdParam(query.propertyId);
  const customerId = parseIdParam(query.customerId);
  return (
    <OfficeAccessShell activeKey="coordinations">
      <CoordinationCreateScreen
        key={`${propertyId ?? ""}-${customerId ?? ""}`}
        initialPropertyId={propertyId}
        initialCustomerId={customerId}
      />
    </OfficeAccessShell>
  );
}
