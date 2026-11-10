import type { Metadata } from "next";
import { ReturnGrantScreen } from "@/features/billing/components/grant-screens";
import { CustomerSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = { title: "자료 반환 | 사이로" };

export default function Page() {
  return (
    <CustomerSiteLayout>
      <ReturnGrantScreen />
    </CustomerSiteLayout>
  );
}
