import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { PrivacyRequestDetailRoute } from "@/features/support/components/privacy-request-detail-route";

export const metadata: Metadata = { title: "권리 요청 처리 상태 | 사이로" };

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const id = Number(requestId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <AccountScreenFrame>
      <Suspense>
        <PrivacyRequestDetailRoute requestId={id} />
      </Suspense>
    </AccountScreenFrame>
  );
}
