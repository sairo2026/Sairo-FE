import type { Metadata } from "next";
import { Suspense } from "react";
import { OperatorListScreen } from "@/features/ops/operators/operator-list";

export const metadata: Metadata = { title: "운영자 | 사이로 운영" };

export default function Page() {
  return (
    <Suspense>
      <OperatorListScreen />
    </Suspense>
  );
}
