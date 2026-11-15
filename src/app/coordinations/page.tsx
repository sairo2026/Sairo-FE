import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CoordinationListScreen } from "@/features/visit/components/coordination-list-screen";
import { parseStatusParam } from "@/features/visit/model/visit-routes";

export const metadata: Metadata = { title: "방문 조율" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const query = await searchParams;
  const status = parseStatusParam(query.status);
  return (
    <OfficeAccessShell activeKey="coordinations">
      <CoordinationListScreen key={status ?? ""} initialStatus={status} />
    </OfficeAccessShell>
  );
}
