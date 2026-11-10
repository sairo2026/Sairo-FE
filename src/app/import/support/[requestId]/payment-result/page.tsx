import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { SupportPaymentResultRoute } from "@/features/migration/components/support-payment-result-route";

export const metadata: Metadata = { title: "이전 지원 결제 확인 | 사이로" };

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const id = Number(requestId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <OfficeAccessShell activeKey="import">
      <Suspense>
        <SupportPaymentResultRoute requestId={id} />
      </Suspense>
    </OfficeAccessShell>
  );
}
