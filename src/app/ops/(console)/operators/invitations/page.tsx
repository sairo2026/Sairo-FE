import type { Metadata } from "next";
import { Suspense } from "react";
import { OperatorInvitationsScreen } from "@/features/ops/operators/operator-invitations";

export const metadata: Metadata = { title: "운영자 초대 | 사이로 운영" };

export default function Page() {
  return (
    <Suspense>
      <OperatorInvitationsScreen />
    </Suspense>
  );
}
