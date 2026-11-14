import type { Metadata } from "next";
import { CompanyInfoScreen } from "@/features/ops/company-info/company-info-screen";

export const metadata: Metadata = { title: "회사 정보 | 사이로 운영" };

export default function Page() {
  return <CompanyInfoScreen />;
}
