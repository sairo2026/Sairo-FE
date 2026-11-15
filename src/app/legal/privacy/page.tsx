import type { Metadata } from "next";
import { LegalDocumentScreen } from "@/features/billing/components/legal-document-screen";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { PublicSiteLayout } from "@/shared/layouts/layouts";
import { INDEXABLE_ROBOTS } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "사이로의 개인정보처리방침 안내입니다.",
  robots: INDEXABLE_ROBOTS,
};

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooter />}>
      <LegalDocumentScreen slug="privacy" />
    </PublicSiteLayout>
  );
}
