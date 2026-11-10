"use client";

import { useSearchParams } from "next/navigation";
import { ContractCreateScreen } from "./contract-form-screen";

export function ContractCreateRoute() {
  const raw = useSearchParams().get("propertyId");
  const parsed = raw === null ? null : Number(raw);
  const propertyId = parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  return <ContractCreateScreen propertyId={propertyId} />;
}
