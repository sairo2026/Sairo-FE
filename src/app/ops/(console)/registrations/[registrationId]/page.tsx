import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegistrationDetailScreen } from "@/features/ops/registrations/registration-detail";

export const metadata: Metadata = { title: "인증 신청 상세 | 사이로 운영" };

export default async function Page({ params }: { params: Promise<{ registrationId: string }> }) {
  const { registrationId: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <RegistrationDetailScreen registrationId={id} />;
}
