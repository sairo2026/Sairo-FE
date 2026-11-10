import type { Metadata } from "next";
import { CustomerLinkScreen } from "@/features/visit/components/customer-link-screen";
import { CustomerSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = {
  title: "방문 가능 시간 | 사이로",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <CustomerSiteLayout>
      <CustomerLinkScreen token={token} />
    </CustomerSiteLayout>
  );
}
