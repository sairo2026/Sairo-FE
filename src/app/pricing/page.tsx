import type { Metadata } from "next";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { PublicPricingScreen } from "@/features/billing/components/public-pricing-screen";
import { PublicSiteLayout } from "@/shared/layouts/layouts";
import { INDEXABLE_ROBOTS } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "요금 안내",
  description: "사이로의 구독 요금과 이용 조건을 안내합니다.",
  robots: INDEXABLE_ROBOTS,
};

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooter />}>
      <PublicPricingScreen />
    </PublicSiteLayout>
  );
}
