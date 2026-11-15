import type { Metadata } from "next";
import { PublicBusinessFooterServer } from "@/features/billing/components/public-business-footer.server";
import { LinkNoticePage } from "@/features/visit/components/link-notice-page";
import { PublicSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = { title: "고객 링크 개인정보 안내" };

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooterServer />}>
      <LinkNoticePage audience="customer" />
    </PublicSiteLayout>
  );
}
