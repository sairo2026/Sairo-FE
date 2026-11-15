import type { Metadata } from "next";
import { LegalIndexScreen } from "@/features/billing/components/legal-document-screen";
import { PublicBusinessFooterServer } from "@/features/billing/components/public-business-footer.server";
import { PublicSiteLayout } from "@/shared/layouts/layouts";
import { INDEXABLE_ROBOTS, publicPageSocialMetadata } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "약관과 정책",
  description: "사이로의 이용약관, 개인정보처리방침, 환불정책 등 약관과 정책을 모아 안내합니다.",
  robots: INDEXABLE_ROBOTS,
  ...publicPageSocialMetadata(
    "약관과 정책",
    "사이로의 이용약관, 개인정보처리방침, 환불정책 등 약관과 정책을 모아 안내합니다.",
    "/legal",
  ),
};

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooterServer />}>
      <LegalIndexScreen />
    </PublicSiteLayout>
  );
}
