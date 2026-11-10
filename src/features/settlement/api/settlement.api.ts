import { z } from "zod";
import {
  MonthlyMemoResponseSchema,
  MonthlyMemoUpsertResponseSchema,
  MonthlySettlementListResponseSchema,
  MonthlySettlementResponseSchema,
} from "@/lib/api/contracts/work.schema";
import { apiFetch, withQuery } from "@/shared/api/client";

export const SettlementDetailRowSchema = z.record(z.string(), z.unknown());

export const SettlementDetailPageSchema = z.object({
  metric: z.string(),
  yearMonth: z.string(),
  items: z.array(SettlementDetailRowSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type SettlementDetailPage = z.infer<typeof SettlementDetailPageSchema>;

export function listSettlements() {
  return apiFetch("/api/settlements", { schema: MonthlySettlementListResponseSchema });
}

export function fetchSettlement(yearMonth: string) {
  return apiFetch(`/api/settlements/${yearMonth}`, { schema: MonthlySettlementResponseSchema });
}

export function fetchSettlementDetails(
  yearMonth: string,
  params: { metric: string; page: number; size: number },
) {
  return apiFetch(withQuery(`/api/settlements/${yearMonth}/details`, { ...params }), {
    schema: SettlementDetailPageSchema,
  });
}

export function fetchMemo(yearMonth: string) {
  return apiFetch(`/api/settlements/${yearMonth}/memo`, { schema: MonthlyMemoResponseSchema });
}

export function saveMemo(yearMonth: string, version: number, content: string) {
  return apiFetch(`/api/settlements/${yearMonth}/memo`, {
    method: "PUT",
    body: { content },
    headers: { "If-Match": String(version) },
    schema: MonthlyMemoUpsertResponseSchema,
  });
}
