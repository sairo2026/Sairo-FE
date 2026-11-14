import type { Metadata } from "next";
import { Suspense } from "react";
import { RawAccessListScreen } from "@/features/ops/raw-access/raw-access-list";

export const metadata: Metadata = { title: "원문 접근 | 사이로 운영" };

export default function Page() {
  return (
    <Suspense>
      <RawAccessListScreen />
    </Suspense>
  );
}
