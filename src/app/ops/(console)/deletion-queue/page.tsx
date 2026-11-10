import type { Metadata } from "next";
import { DeletionQueueScreen } from "@/features/ops/deletion-queue/deletion-queue-list";

export const metadata: Metadata = { title: "파기 큐 | 사이로 운영" };

export default function Page() {
  return <DeletionQueueScreen />;
}
