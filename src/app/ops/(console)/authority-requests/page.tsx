import type { Metadata } from "next";
import { AuthorityRequestsScreen } from "@/features/ops/authority-requests/authority-screen";

export const metadata: Metadata = { title: "수사기관 요청 | 사이로 운영" };

export default function Page() {
  return <AuthorityRequestsScreen />;
}
