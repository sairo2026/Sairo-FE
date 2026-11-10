import type { Metadata } from "next";
import { ReconciliationScreen } from "@/features/ops/billing/reconciliation";

export const metadata: Metadata = { title: "PG 대사 | 사이로 운영" };

export default function Page() {
  return <ReconciliationScreen />;
}
