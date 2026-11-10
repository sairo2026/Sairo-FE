import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeDetailScreen } from "@/features/ops/offices/components/office-detail-screen";

export const metadata: Metadata = { title: "고객사 상세 | 사이로" };

export default async function OpsOfficeDetailPage({
  params,
}: {
  params: Promise<{ officeId: string }>;
}) {
  const { officeId } = await params;
  const id = Number(officeId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <OfficeDetailScreen officeId={id} />;
}
