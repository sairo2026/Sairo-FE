"use client";

import { useSearchParams } from "next/navigation";
import { InquiryDetailScreen } from "./inquiry-detail-screen";

export function InquiryDetailRoute({ inquiryId }: { inquiryId: number }) {
  const received = useSearchParams().get("received") === "1";
  return <InquiryDetailScreen inquiryId={inquiryId} justReceived={received} />;
}
