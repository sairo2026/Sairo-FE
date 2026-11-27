import type { Metadata } from "next";
import { CustomerPortalRequestScreen } from "@/features/visit/components/customer-portal-request-screen";
import { CustomerSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = {
  title: "방문 가능 시간 확인 | 사이로",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ coordinationId: string }> }) {
  const { coordinationId: rawId } = await params;
  const coordinationId = /^[1-9]\d{0,15}$/.test(rawId) ? Number(rawId) : NaN;
  return (
    <CustomerSiteLayout>
      <CustomerPortalRequestScreen coordinationId={coordinationId} />
    </CustomerSiteLayout>
  );
}
