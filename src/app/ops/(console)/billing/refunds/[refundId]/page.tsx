import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RefundDetailScreen } from "@/features/ops/billing/refund-detail";

export const metadata: Metadata = { title: "환불 상세 | 사이로 운영" };

export default async function Page({ params }: { params: Promise<{ refundId: string }> }) {
  const { refundId: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <RefundDetailScreen refundId={id} />;
}
