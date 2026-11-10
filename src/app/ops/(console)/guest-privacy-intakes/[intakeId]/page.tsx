import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntakeDetailScreen } from "@/features/ops/guest-privacy-intakes/intake-detail";

export const metadata: Metadata = { title: "비회원 권리 요청 상세 | 사이로 운영" };

export default async function Page({ params }: { params: Promise<{ intakeId: string }> }) {
  const { intakeId: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <IntakeDetailScreen intakeId={id} />;
}
