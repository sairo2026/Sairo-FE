import type { Metadata } from "next";
import { DisputeScreen } from "@/features/ops/visit-review-disputes/dispute-screen";

export const metadata: Metadata = { title: "평가 이의 | 사이로 운영" };

export default function Page() {
  return <DisputeScreen />;
}
