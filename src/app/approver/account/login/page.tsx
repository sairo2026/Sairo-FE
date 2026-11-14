import type { Metadata } from "next";
import { ApproverLayout } from "@/shared/layouts/layouts";
import { ApproverLoginScreen } from "@/features/visit/components/approver-login-screen";

export const metadata: Metadata = {
  title: "승인자 번호 인증 | 사이로",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return (
    <ApproverLayout>
      <ApproverLoginScreen token={Array.isArray(token) ? token[0] : token} />
    </ApproverLayout>
  );
}
