import type { Metadata } from "next";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { PublicPricingScreen } from "@/features/billing/components/public-pricing-screen";
import { PublicSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = { title: "요금 안내 | 사이로" };

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooter />}>
      <PublicPricingScreen />
    </PublicSiteLayout>
  );
}
