import type { Metadata } from "next";
import { PricingSummaryServer } from "@/features/billing/components/pricing-summary.server";
import { PublicBusinessFooterServer } from "@/features/billing/components/public-business-footer.server";
import { LandingPage } from "@/features/landing/components/landing-page";
import { NOINDEX_ROBOTS } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "사이로 소개",
  robots: NOINDEX_ROBOTS,
};

export default function WelcomePage() {
  return <LandingPage pricing={<PricingSummaryServer />} footer={<PublicBusinessFooterServer />} />;
}
