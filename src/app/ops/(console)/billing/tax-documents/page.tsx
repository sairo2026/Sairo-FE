import type { Metadata } from "next";
import { TaxDocumentListScreen } from "@/features/ops/tax-documents/tax-document-list";

export const metadata: Metadata = { title: "증빙 발급 기록 | 사이로 운영" };

export default function Page() {
  return <TaxDocumentListScreen />;
}
