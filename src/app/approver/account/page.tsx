import type { Metadata } from "next";
import { ApproverLayout } from "@/shared/layouts/layouts";
import { ApproverAccountScreen } from "@/features/visit/components/approver-account-screen";

export const metadata: Metadata = {
  title: "내 매물 모아보기 | 사이로",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ApproverLayout>
      <ApproverAccountScreen />
    </ApproverLayout>
  );
}
