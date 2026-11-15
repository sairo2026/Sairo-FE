import type { Metadata } from "next";
import { PublicBusinessFooterServer } from "@/features/billing/components/public-business-footer.server";
import { PublicPricingScreenServer } from "@/features/billing/components/public-pricing-screen.server";
import { PublicSiteLayout } from "@/shared/layouts/layouts";
import { INDEXABLE_ROBOTS, publicPageSocialMetadata } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "요금 안내",
  description: "사이로의 구독 요금과 이용 조건을 안내합니다.",
  robots: INDEXABLE_ROBOTS,
  ...publicPageSocialMetadata("요금 안내", "사이로의 구독 요금과 이용 조건을 안내합니다."),
};

export default function Page() {
  return (
    <PublicSiteLayout footer={<PublicBusinessFooterServer />}>
      <PublicPricingScreenServer />
    </PublicSiteLayout>
  );
}
