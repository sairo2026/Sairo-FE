import type { Metadata } from "next";
import { LegalDocumentScreen } from "@/features/billing/components/legal-document-screen";
import { PublicBusinessFooterServer } from "@/features/billing/components/public-business-footer.server";
import { PublicSiteLayout } from "@/shared/layouts/layouts";
import { INDEXABLE_ROBOTS, publicPageSocialMetadata } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "개인정보 처리위탁 안내",
  description: "사이로의 개인정보 처리위탁 안내입니다.",
  robots: INDEXABLE_ROBOTS,
  ...publicPageSocialMetadata("개인정보 처리위탁 안내", "사이로의 개인정보 처리위탁 안내입니다."),
};

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooterServer />}>
      <LegalDocumentScreen slug="processing-outsourcing" />
    </PublicSiteLayout>
  );
}
