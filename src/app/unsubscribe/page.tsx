import type { Metadata } from "next";
import { MarketingUnsubscribe } from "@/features/auth/components/marketing-unsubscribe";
import { normalizeLinkToken } from "@/shared/lib/link-token";

export const metadata: Metadata = { title: "수신 거부 | 사이로", referrer: "no-referrer" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function Page({ searchParams }: Props) {
  const { token } = await searchParams;
  return <MarketingUnsubscribe token={normalizeLinkToken(token)} />;
}
