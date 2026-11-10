import type { Metadata } from "next";
import { SystemJobsScreen } from "@/features/ops/system-jobs/system-jobs-screen";

export const metadata: Metadata = { title: "시스템 작업 | 사이로 운영" };

export default function Page() {
  return <SystemJobsScreen />;
}
