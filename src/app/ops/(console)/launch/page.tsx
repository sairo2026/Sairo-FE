import type { Metadata } from "next";
import { LaunchScreen } from "@/features/ops/launch/launch-screen";

export const metadata: Metadata = { title: "출시 활성화 | 사이로 운영" };

export default function Page() {
  return <LaunchScreen />;
}
