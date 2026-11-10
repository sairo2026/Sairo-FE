import type { Metadata } from "next";
import { InvoiceListScreen } from "@/features/ops/billing/invoice-list";

export const metadata: Metadata = { title: "결제·환불·대사 | 사이로 운영" };

export default function Page() {
  return <InvoiceListScreen />;
}
