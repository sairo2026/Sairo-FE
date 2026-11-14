import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApproverLayout } from "@/shared/layouts/layouts";
import { ApproverPortalApprovalScreen } from "@/features/visit/components/approver-link-screen";

export const metadata: Metadata = {
  title: "방문 조건과 신청 | 사이로",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ approvalId: string }> }) {
  const { approvalId } = await params;
  const id = Number(approvalId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return (
    <ApproverLayout>
      <ApproverPortalApprovalScreen approvalId={id} />
    </ApproverLayout>
  );
}
