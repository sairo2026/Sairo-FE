import type { Metadata } from "next";
import { OfficesListScreen } from "@/features/ops/offices/components/offices-list-screen";

export const metadata: Metadata = { title: "고객사 | 사이로" };

export default function OpsOfficesPage() {
  return <OfficesListScreen />;
}
