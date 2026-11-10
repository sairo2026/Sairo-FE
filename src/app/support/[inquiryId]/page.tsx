import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { InquiryDetailRoute } from "@/features/support/components/inquiry-detail-route";

export const metadata: Metadata = { title: "문의 상세 | 사이로" };

export default async function Page({ params }: { params: Promise<{ inquiryId: string }> }) {
  const { inquiryId } = await params;
  const id = Number(inquiryId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <AccountScreenFrame>
      <Suspense>
        <InquiryDetailRoute inquiryId={id} />
      </Suspense>
    </AccountScreenFrame>
  );
}
