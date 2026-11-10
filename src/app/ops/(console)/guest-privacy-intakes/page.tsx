import type { Metadata } from "next";
import { IntakeListScreen } from "@/features/ops/guest-privacy-intakes/intake-list";

export const metadata: Metadata = { title: "비회원 권리 요청 | 사이로 운영" };

export default function Page() {
  return <IntakeListScreen />;
}
