import type { Metadata } from "next";
import { PricingSummary } from "@/features/billing/components/pricing-summary";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { LandingPage } from "@/features/landing/components/landing-page";
import { LANDING_META } from "@/features/landing/model/landing-copy";
import { INDEXABLE_ROBOTS, SITE_OG_IMAGE, SITE_URL } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: { absolute: LANDING_META.title },
  description: LANDING_META.description,
  alternates: { canonical: SITE_URL },
  robots: INDEXABLE_ROBOTS,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "사이로(SAIRO)",
    locale: "ko_KR",
    title: LANDING_META.title,
    description: LANDING_META.description,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: LANDING_META.title,
    description: LANDING_META.description,
    images: [SITE_OG_IMAGE.url],
  },
};

export default function Page() {
  return <LandingPage pricing={<PricingSummary />} footer={<PublicBusinessFooter />} />;
}
