import type { Metadata } from "next";
import { RefundListScreen } from "@/features/ops/billing/refund-list";

export const metadata: Metadata = { title: "환불 신청 | 사이로 운영" };

export default function Page() {
  return <RefundListScreen />;
}
