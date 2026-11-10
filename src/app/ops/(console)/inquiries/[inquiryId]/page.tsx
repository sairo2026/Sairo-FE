import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InquiryDetailScreen } from "@/features/ops/inquiries/inquiry-detail";

export const metadata: Metadata = { title: "문의 상세 | 사이로 운영" };

export default async function Page({ params }: { params: Promise<{ inquiryId: string }> }) {
  const { inquiryId: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <InquiryDetailScreen inquiryId={id} />;
}
