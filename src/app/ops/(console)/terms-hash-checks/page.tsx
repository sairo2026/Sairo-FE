import type { Metadata } from "next";
import { TermsHashScreen } from "@/features/ops/terms-hash-checks/terms-hash-screen";

export const metadata: Metadata = { title: "약관 해시 점검 | 사이로 운영" };

export default function Page() {
  return <TermsHashScreen />;
}
