"use client";

import { useQuery } from "@tanstack/react-query";
import { accountQueryKey, fetchAccountAgreements } from "./consent.api";

export function useAccountMe() {
  return useQuery({ queryKey: accountQueryKey, queryFn: fetchAccountAgreements });
}
