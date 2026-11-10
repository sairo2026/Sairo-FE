import type { Metadata } from "next";
import { TrialEventsScreen } from "@/features/ops/trial-events/trial-events-screen";

export const metadata: Metadata = { title: "체험 이벤트 | 사이로 운영" };

export default function Page() {
  return <TrialEventsScreen />;
}
