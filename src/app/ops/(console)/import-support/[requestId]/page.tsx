import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImportSupportDetailScreen } from "@/features/ops/import-support/import-support-detail";

export const metadata: Metadata = { title: "이전 지원 상세 | 사이로 운영" };

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <ImportSupportDetailScreen requestId={id} />;
}
