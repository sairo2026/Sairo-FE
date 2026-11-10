import type { Metadata } from "next";
import { GrantsScreen } from "@/features/ops/privacy-requests/grants-screen";

export const metadata: Metadata = { title: "반환·보관 권한 | 사이로 운영" };

export default function Page() {
  return <GrantsScreen />;
}
