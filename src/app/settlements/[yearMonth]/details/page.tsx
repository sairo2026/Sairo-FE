import type { Metadata } from "next";
import { Suspense } from "react";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { SettlementDetailsScreen } from "@/features/settlement/components/settlement-details-screen";

export const metadata: Metadata = { title: "월말결산 상세 내역 | 사이로" };

export default async function Page({ params }: { params: Promise<{ yearMonth: string }> }) {
  const { yearMonth } = await params;
  return (
    <OfficeAccessShell activeKey="settlements">
      <Suspense>
        <SettlementDetailsScreen yearMonth={yearMonth} />
      </Suspense>
    </OfficeAccessShell>
  );
}
