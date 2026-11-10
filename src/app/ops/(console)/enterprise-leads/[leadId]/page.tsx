import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadDetailScreen } from "@/features/ops/enterprise-leads/lead-detail";

export const metadata: Metadata = { title: "기업 도입 문의 상세 | 사이로 운영" };

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <LeadDetailScreen leadId={id} />;
}
