import type { Metadata } from "next";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { LinkNoticePage } from "@/features/visit/components/link-notice-page";
import { PublicSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = { title: "승인자 링크 개인정보 안내 | 사이로" };

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooter />}>
      <LinkNoticePage audience="approver" />
    </PublicSiteLayout>
  );
}
