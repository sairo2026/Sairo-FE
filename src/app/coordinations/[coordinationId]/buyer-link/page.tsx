import type { Metadata } from "next";
import { BuyerCoordinationLinkFlow } from "@/features/coordination";
import { AuthenticatedOfficeShell } from "@/features/auth/components/session-routing-guard";

export const metadata: Metadata = { title: "구매자 조율 추가 | 사이로" };

export default async function BuyerCoordinationLinkPage({
  params,
}: {
  params: Promise<{ coordinationId: string }>;
}) {
  const { coordinationId } = await params;
  const id = Number(coordinationId);

  return (
    <AuthenticatedOfficeShell active="coordinations">
      {Number.isSafeInteger(id) && id >= 1 ? (
        <BuyerCoordinationLinkFlow coordinationId={id} />
      ) : (
        <p className="text-slate-500">잘못된 임장 조율 건입니다.</p>
      )}
    </AuthenticatedOfficeShell>
  );
}
