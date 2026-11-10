import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDetailScreen } from "@/features/ops/billing/invoice-detail";

export const metadata: Metadata = { title: "청구서 상세 | 사이로 운영" };

export default async function Page({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <InvoiceDetailScreen invoiceId={id} />;
}
