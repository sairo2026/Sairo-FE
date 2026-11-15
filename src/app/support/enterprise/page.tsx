import type { Metadata } from "next";
import { PublicBusinessFooterServer } from "@/features/billing/components/public-business-footer.server";
import { EnterpriseScreen } from "@/features/support/components/enterprise-screen";
import { PublicSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = { title: "기업 도입 문의" };

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooterServer />}>
      <EnterpriseScreen />
    </PublicSiteLayout>
  );
}
