"use client";

import { useSearchParams } from "next/navigation";
import { PrivacyRequestDetailScreen } from "./privacy-request-detail-screen";

export function PrivacyRequestDetailRoute({ requestId }: { requestId: number }) {
  const received = useSearchParams().get("received") === "1";
  return <PrivacyRequestDetailScreen requestId={requestId} justReceived={received} />;
}
