import type { Metadata } from "next";
import { Suspense } from "react";
import { RawAccessNewScreen } from "@/features/ops/raw-access/raw-access-new";

export const metadata: Metadata = { title: "원문 접근 요청 | 사이로 운영" };

export default function Page() {
  return (
    <Suspense>
      <RawAccessNewScreen />
    </Suspense>
  );
}
