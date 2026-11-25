import type { Metadata } from "next";
import { OpsPromotionsScreen } from "@/features/ops/promotions/promotions-screen";

export const metadata: Metadata = { title: "무료 프로모션 | 사이로 운영" };

export default function Page() {
  return <OpsPromotionsScreen />;
}
