import type { Metadata } from "next";
import { LegalDocumentScreen } from "@/features/billing/components/legal-document-screen";
import { PublicBusinessFooterServer } from "@/features/billing/components/public-business-footer.server";
import { PublicSiteLayout } from "@/shared/layouts/layouts";
import { INDEXABLE_ROBOTS, publicPageSocialMetadata } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "이메일 공지·혜택 안내 수신 동의",
  description: "사이로의 이메일 공지·혜택 안내 수신 동의 안내입니다.",
  robots: INDEXABLE_ROBOTS,
  ...publicPageSocialMetadata(
    "이메일 공지·혜택 안내 수신 동의",
    "사이로의 이메일 공지·혜택 안내 수신 동의 안내입니다.",
  ),
};

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooterServer />}>
      <LegalDocumentScreen slug="marketing" />
    </PublicSiteLayout>
  );
}
