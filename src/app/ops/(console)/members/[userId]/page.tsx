import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberDetailScreen } from "@/features/ops/members/components/member-detail-screen";

export const metadata: Metadata = { title: "회원 상세 | 사이로" };

export default async function OpsMemberDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <MemberDetailScreen userId={id} />;
}
