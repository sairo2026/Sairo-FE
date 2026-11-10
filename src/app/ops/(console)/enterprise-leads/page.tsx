import type { Metadata } from "next";
import { LeadListScreen } from "@/features/ops/enterprise-leads/lead-list";

export const metadata: Metadata = { title: "기업 도입 문의 | 사이로 운영" };

export default function Page() {
  return <LeadListScreen />;
}
