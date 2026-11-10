import type { Metadata } from "next";
import { LegalDocumentScreen } from "@/features/billing/components/legal-document-screen";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { PublicSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = { title: "이메일 공지·혜택 안내 수신 동의 | 사이로" };

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooter />}>
      <LegalDocumentScreen slug="marketing" />
    </PublicSiteLayout>
  );
}
