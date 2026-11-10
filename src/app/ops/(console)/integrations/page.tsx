import type { Metadata } from "next";
import { IntegrationsScreen } from "@/features/ops/integrations/integrations-screen";

export const metadata: Metadata = { title: "연동 설정 | 사이로 운영" };

export default function Page() {
  return <IntegrationsScreen />;
}
