"use client";

import { useSearchParams } from "next/navigation";
import { RefundsScreen } from "./refunds-screen";

export function RefundsRoute() {
  const raw = Number(useSearchParams().get("invoiceId"));
  return <RefundsScreen invoiceId={Number.isInteger(raw) && raw > 0 ? raw : undefined} />;
}
