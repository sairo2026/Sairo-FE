import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { FollowupScreen } from "@/features/contract/components/followup-screen";

export const metadata: Metadata = { title: "후속업무·신고 확인 | 사이로" };

export default async function Page({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const id = Number(contractId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <OfficeAccessShell activeKey="contracts">
      <FollowupScreen contractId={id} />
    </OfficeAccessShell>
  );
}
