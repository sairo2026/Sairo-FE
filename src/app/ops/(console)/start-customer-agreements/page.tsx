import type { Metadata } from "next";
import { AgreementsScreen } from "@/features/ops/start-customer-agreements/agreements-screen";

export const metadata: Metadata = { title: "시작 고객 합의 | 사이로 운영" };

export default function Page() {
  return <AgreementsScreen />;
}
