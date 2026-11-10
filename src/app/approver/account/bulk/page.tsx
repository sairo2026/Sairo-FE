import type { Metadata } from "next";
import { ApproverLayout } from "@/shared/layouts/layouts";
import { ApproverBulkScreen } from "@/features/visit/components/approver-bulk-screen";

export const metadata: Metadata = {
  title: "조건 일괄 적용 | 사이로",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const { ids } = await searchParams;
  const raw = Array.isArray(ids) ? ids[0] : ids;
  const initialIds = (raw ?? "")
    .split(",")
    .map(Number)
    .filter((value) => Number.isSafeInteger(value) && value > 0);
  return (
    <ApproverLayout>
      <ApproverBulkScreen initialIds={initialIds} />
    </ApproverLayout>
  );
}
