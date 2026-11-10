"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchMemo,
  fetchSettlement,
  fetchSettlementDetails,
  listSettlements,
} from "../api/settlement.api";

export const settlementKeys = {
  list: ["settlement", "list"] as const,
  month: (yearMonth: string) => ["settlement", "month", yearMonth] as const,
  details: (yearMonth: string, metric: string, page: number, size: number) =>
    ["settlement", "details", yearMonth, metric, page, size] as const,
  memo: (yearMonth: string) => ["settlement", "memo", yearMonth] as const,
};

export function useSettlementList() {
  return useQuery({ queryKey: settlementKeys.list, queryFn: listSettlements });
}

export function useSettlement(yearMonth: string) {
  return useQuery({
    queryKey: settlementKeys.month(yearMonth),
    queryFn: () => fetchSettlement(yearMonth),
  });
}

export function useSettlementDetails(
  yearMonth: string,
  metric: string,
  page: number,
  size: number,
  enabled = true,
) {
  return useQuery({
    queryKey: settlementKeys.details(yearMonth, metric, page, size),
    queryFn: () => fetchSettlementDetails(yearMonth, { metric, page, size }),
    enabled,
  });
}

export function useMonthlyMemo(yearMonth: string) {
  return useQuery({
    queryKey: settlementKeys.memo(yearMonth),
    queryFn: () => fetchMemo(yearMonth),
  });
}
