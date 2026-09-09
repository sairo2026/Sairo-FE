import type { Metadata } from "next";
import { CoordinationDetail } from "@/features/coordination";
import { AuthenticatedOfficeShell } from "@/features/auth/components/session-routing-guard";

export const metadata: Metadata = { title: "임장 조율 상세 | 사이로" };

export default async function CoordinationDetailPage({
  params,
}: {
  params: Promise<{ coordinationId: string }>;
}) {
  const { coordinationId } = await params;
  const id = Number(coordinationId);

  return (
    <AuthenticatedOfficeShell active="coordinations">
      {Number.isSafeInteger(id) && id >= 1 ? (
        <CoordinationDetail coordinationId={id} />
      ) : (
        <p className="text-slate-500">잘못된 임장 조율 건입니다.</p>
      )}
    </AuthenticatedOfficeShell>
  );
}
