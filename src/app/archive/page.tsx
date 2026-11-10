import type { Metadata } from "next";
import { ArchiveGrantScreen } from "@/features/billing/components/grant-screens";
import { CustomerSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = { title: "보관 문서 | 사이로" };

export default function Page() {
  return (
    <CustomerSiteLayout>
      <ArchiveGrantScreen />
    </CustomerSiteLayout>
  );
}
