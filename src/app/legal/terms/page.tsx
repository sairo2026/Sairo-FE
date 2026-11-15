import type { Metadata } from "next";
import { LegalDocumentScreen } from "@/features/billing/components/legal-document-screen";
import { PublicBusinessFooterServer } from "@/features/billing/components/public-business-footer.server";
import { PublicSiteLayout } from "@/shared/layouts/layouts";
import { INDEXABLE_ROBOTS, publicPageSocialMetadata } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "이용약관",
  description: "사이로의 이용약관 안내입니다.",
  robots: INDEXABLE_ROBOTS,
  ...publicPageSocialMetadata("이용약관", "사이로의 이용약관 안내입니다."),
};

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooterServer />}>
      <LegalDocumentScreen slug="terms" />
    </PublicSiteLayout>
  );
}
