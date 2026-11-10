"use client";

import { useSearchParams } from "next/navigation";
import { ConsentScreen } from "./consent-screen";

function toNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function ConsentRoute() {
  const params = useSearchParams();
  const plan = params.get("plan");
  return (
    <ConsentScreen
      noticeId={toNumber(params.get("noticeId"))}
      plan={plan === "SOLO" || plan === "TEAM" ? plan : undefined}
    />
  );
}
