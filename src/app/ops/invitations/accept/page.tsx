import type { Metadata } from "next";
import { InvitationAcceptScreen } from "@/features/ops/auth/components/invitation-accept-screen";

export const metadata: Metadata = {
  title: "운영자 초대 | 사이로",
  referrer: "no-referrer",
};

type AcceptPageProps = {
  searchParams: Promise<{ token?: string; error?: string; state?: string }>;
};

export default async function OpsInvitationAcceptPage({ searchParams }: AcceptPageProps) {
  const { token, error, state } = await searchParams;
  return <InvitationAcceptScreen token={token} errorCode={error} errorState={state} />;
}
