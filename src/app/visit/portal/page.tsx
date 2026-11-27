import type { Metadata } from "next";
import { CustomerPortalIndex } from "@/features/visit/components/customer-portal-index";
import { CustomerSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = {
  title: "내 방문 요청",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <CustomerSiteLayout>
      <CustomerPortalIndex />
    </CustomerSiteLayout>
  );
}
