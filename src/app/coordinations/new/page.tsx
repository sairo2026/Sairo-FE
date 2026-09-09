import type { Metadata } from "next";
import Link from "next/link";
import { CoordinationRequestFlow } from "@/features/coordination";
import { AuthenticatedOfficeShell } from "@/features/auth/components/session-routing-guard";

export const metadata: Metadata = { title: "임장 조율 생성 | 사이로" };

export default async function NewCoordinationPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const { propertyId } = await searchParams;
  const id = propertyId === undefined ? NaN : Number(propertyId);

  return (
    <AuthenticatedOfficeShell active="coordinations">
      {Number.isSafeInteger(id) && id >= 1 ? (
        <CoordinationRequestFlow propertyId={id} />
      ) : (
        <div>
          <h1 className="mb-4 text-3xl font-bold">임장 조율 생성</h1>
          <p className="mb-6 text-slate-500">
            임장 조율을 시작할 매물을 먼저 선택해주세요. 매물 목록 또는 매물 조회 화면에서 [임장
            조율 시작] 또는 [임장 조율 생성]을 눌러 진입할 수 있습니다.
          </p>
          <Link href="/properties" className="font-semibold text-[#3937b8]">
            매물 목록으로 이동
          </Link>
        </div>
      )}
    </AuthenticatedOfficeShell>
  );
}
