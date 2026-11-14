import type { Metadata } from "next";
import { ImportSupportListScreen } from "@/features/ops/import-support/import-support-list";

export const metadata: Metadata = { title: "이전 지원 처리 | 사이로 운영" };

export default function Page() {
  return <ImportSupportListScreen />;
}
