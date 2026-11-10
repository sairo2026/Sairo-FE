import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrivacyDetailScreen } from "@/features/ops/privacy-requests/privacy-detail";

export const metadata: Metadata = { title: "개인정보 요청 상세 | 사이로 운영" };

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <PrivacyDetailScreen requestId={id} />;
}
