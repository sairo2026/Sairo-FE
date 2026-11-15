import type { Metadata } from "next";
import { LegalDocumentScreen } from "@/features/billing/components/legal-document-screen";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { PublicSiteLayout } from "@/shared/layouts/layouts";
import { INDEXABLE_ROBOTS } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "구독·결제 약관",
  description: "사이로의 구독·결제 약관 안내입니다.",
  robots: INDEXABLE_ROBOTS,
};

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooter />}>
      <LegalDocumentScreen slug="subscription-terms" />
    </PublicSiteLayout>
  );
}
