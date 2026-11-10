import type { Metadata } from "next";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { EnterpriseScreen } from "@/features/support/components/enterprise-screen";
import { PublicSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = { title: "기업 도입 문의 | 사이로" };

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooter />}>
      <EnterpriseScreen />
    </PublicSiteLayout>
  );
}
