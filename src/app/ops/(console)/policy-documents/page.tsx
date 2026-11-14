import type { Metadata } from "next";
import { PolicyDocumentsScreen } from "@/features/ops/policy-documents/policy-documents-screen";

export const metadata: Metadata = { title: "정책 문서 관리 | 사이로 운영" };

export default function Page() {
  return <PolicyDocumentsScreen />;
}
