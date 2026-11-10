import type { Metadata } from "next";
import { IncidentsScreen } from "@/features/ops/incidents/incidents-screen";

export const metadata: Metadata = { title: "장애·사고 | 사이로 운영" };

export default function Page() {
  return <IncidentsScreen />;
}
