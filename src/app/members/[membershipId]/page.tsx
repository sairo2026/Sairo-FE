import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { MemberDetailScreen } from "@/features/office/components/member-detail-screen";

export const metadata: Metadata = { title: "구성원 상세 | 사이로" };

export default async function Page({ params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params;
  const id = Number(membershipId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return (
    <OfficeAccessShell activeKey="office">
      <MemberDetailScreen membershipId={id} />
    </OfficeAccessShell>
  );
}
