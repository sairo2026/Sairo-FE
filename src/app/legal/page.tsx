import type { Metadata } from "next";
import { LegalIndexScreen } from "@/features/billing/components/legal-document-screen";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { PublicSiteLayout } from "@/shared/layouts/layouts";
import { INDEXABLE_ROBOTS } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "약관과 정책",
  description: "사이로의 이용약관, 개인정보처리방침, 환불정책 등 약관과 정책을 모아 안내합니다.",
  robots: INDEXABLE_ROBOTS,
};

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooter />}>
      <LegalIndexScreen />
    </PublicSiteLayout>
  );
}
