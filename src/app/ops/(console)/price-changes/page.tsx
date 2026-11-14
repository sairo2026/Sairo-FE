import type { Metadata } from "next";
import { PriceChangesScreen } from "@/features/ops/price-changes/price-changes-screen";

export const metadata: Metadata = { title: "가격 변경 안내 | 사이로 운영" };

export default function Page() {
  return <PriceChangesScreen />;
}
