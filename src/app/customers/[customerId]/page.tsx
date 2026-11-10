import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { CustomerDetailScreen } from "@/features/customer/components/customer-detail-screen";

export const metadata: Metadata = { title: "고객 상세 | 사이로" };

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const id = Number(customerId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return (
    <OfficeAccessShell activeKey="customers">
      <CustomerDetailScreen customerId={id} />
    </OfficeAccessShell>
  );
}
