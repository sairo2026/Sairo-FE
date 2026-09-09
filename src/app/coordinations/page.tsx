import type { Metadata } from "next";
import { Suspense } from "react";
import { CoordinationList } from "@/features/coordination";
import { AuthenticatedOfficeShell } from "@/features/auth/components/session-routing-guard";

export const metadata: Metadata = { title: "임장 조율 | 사이로" };

export default function CoordinationsPage() {
  return (
    <AuthenticatedOfficeShell active="coordinations">
      <Suspense fallback={<p className="text-slate-500">임장 조율을 불러오는 중입니다.</p>}>
        <CoordinationList />
      </Suspense>
    </AuthenticatedOfficeShell>
  );
}
