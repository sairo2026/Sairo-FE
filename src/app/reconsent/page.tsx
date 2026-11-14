import type { Metadata } from "next";
import { ReconsentNotice } from "@/features/auth/components/reconsent-notice";

export const metadata: Metadata = { title: "약관 재동의 | 사이로" };

export default function ReconsentPage() {
  return <ReconsentNotice />;
}
