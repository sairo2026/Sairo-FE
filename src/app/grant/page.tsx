import type { Metadata } from "next";
import { Suspense } from "react";
import { GrantAuthRoute } from "@/features/billing/components/grant-routes";
import { CustomerSiteLayout } from "@/shared/layouts/layouts";

export const metadata: Metadata = { title: "본인 확인 | 사이로" };

export default function Page() {
  return (
    <CustomerSiteLayout>
      <Suspense>
        <GrantAuthRoute />
      </Suspense>
    </CustomerSiteLayout>
  );
}
