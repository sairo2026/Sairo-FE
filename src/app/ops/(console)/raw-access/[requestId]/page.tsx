import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RawAccessDetailScreen } from "@/features/ops/raw-access/raw-access-detail";

export const metadata: Metadata = { title: "원문 접근 요청 상세 | 사이로 운영" };

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <RawAccessDetailScreen requestId={id} />;
}
