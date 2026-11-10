import type { Metadata } from "next";
import { RetentionRulesScreen } from "@/features/ops/retention-rules/retention-rules-screen";

export const metadata: Metadata = { title: "보관 규칙 | 사이로 운영" };

export default function Page() {
  return <RetentionRulesScreen />;
}
