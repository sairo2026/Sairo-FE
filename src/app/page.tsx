import type { Metadata } from "next";
import { PricingSummary } from "@/features/billing/components/pricing-summary";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { LandingPage } from "@/features/landing/components/landing-page";
import { LANDING_META } from "@/features/landing/model/landing-copy";

export const metadata: Metadata = {
  title: LANDING_META.title,
  description: LANDING_META.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "사이로",
    locale: "ko_KR",
    title: LANDING_META.title,
    description: LANDING_META.description,
    images: [{ url: "/brand/sairo-og.png", width: 1200, height: 630, alt: "사이로" }],
  },
  twitter: {
    card: "summary_large_image",
    title: LANDING_META.title,
    description: LANDING_META.description,
    images: ["/brand/sairo-og.png"],
  },
};

export default function Page() {
  return <LandingPage pricing={<PricingSummary />} footer={<PublicBusinessFooter />} />;
}
