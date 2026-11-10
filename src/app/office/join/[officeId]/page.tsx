import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { notFound } from "next/navigation";
import { MembershipRequestForm } from "@/features/office/components/membership-screens";

export const metadata: Metadata = { title: "참여 요청 | 사이로" };

export default async function Page({ params }: { params: Promise<{ officeId: string }> }) {
  const { officeId } = await params;
  const id = Number(officeId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return (
    <AccountScreenFrame>
      <MembershipRequestForm officeId={id} />
    </AccountScreenFrame>
  );
}
