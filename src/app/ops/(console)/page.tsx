import type { Metadata } from "next";
import { OpsHomeScreen } from "@/features/ops/home/components/ops-home-screen";

export const metadata: Metadata = { title: "운영 홈 | 사이로" };

export default function OpsHomePage() {
  return <OpsHomeScreen />;
}
