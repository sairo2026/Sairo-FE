import type { Metadata } from "next";
import { ApproverLayout } from "@/shared/layouts/layouts";
import { ApproverLinkScreen } from "@/features/visit/components/approver-link-screen";

export const metadata: Metadata = {
  title: "방문 조건과 신청 | 사이로",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <ApproverLayout>
      <ApproverLinkScreen token={token} />
    </ApproverLayout>
  );
}
