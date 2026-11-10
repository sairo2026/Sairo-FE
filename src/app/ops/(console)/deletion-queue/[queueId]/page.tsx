import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeletionDetailScreen } from "@/features/ops/deletion-queue/deletion-detail";

export const metadata: Metadata = { title: "파기 건 상세 | 사이로 운영" };

export default async function Page({ params }: { params: Promise<{ queueId: string }> }) {
  const { queueId: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <DeletionDetailScreen queueId={id} />;
}
