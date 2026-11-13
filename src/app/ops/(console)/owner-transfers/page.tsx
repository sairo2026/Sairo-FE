import type { Metadata } from "next";
import { OwnerTransferListScreen } from "@/features/ops/owner-transfers/transfer-list";

export const metadata: Metadata = { title: "대표 이전 | 사이로 운영" };

export default function Page() {
  return <OwnerTransferListScreen />;
}
