import type { Metadata } from "next";
import { InquiryListScreen } from "@/features/ops/inquiries/inquiry-list";

export const metadata: Metadata = { title: "문의·티켓 | 사이로 운영" };

export default function Page() {
  return <InquiryListScreen />;
}
