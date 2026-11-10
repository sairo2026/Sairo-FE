import type { Metadata } from "next";
import { MembersListScreen } from "@/features/ops/members/components/members-list-screen";

export const metadata: Metadata = { title: "회원 | 사이로" };

export default function OpsMembersPage() {
  return <MembersListScreen />;
}
