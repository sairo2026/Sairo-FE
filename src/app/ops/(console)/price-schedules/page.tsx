import type { Metadata } from "next";
import { PriceSchedulesScreen } from "@/features/ops/price-schedules/price-schedules-screen";

export const metadata: Metadata = { title: "요금표 | 사이로 운영" };

export default function Page() {
  return <PriceSchedulesScreen />;
}
