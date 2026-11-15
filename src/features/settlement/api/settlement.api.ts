import { z } from "zod";
import {
  MonthlyMemoResponseSchema,
  MonthlyMemoUpsertResponseSchema,
  MonthlySettlementListResponseSchema,
  MonthlySettlementResponseSchema,
} from "@/lib/api/contracts/work.schema";
import { ApiError, apiFetch, withQuery } from "@/shared/api/client";

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

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const record = typeof body === "object" && body !== null ? body : {};
  const code = "code" in record && typeof record.code === "string" ? record.code : "UNKNOWN";
  const message =
    "message" in record && typeof record.message === "string"
      ? record.message
      : "요청을 처리하지 못했습니다.";
  return new ApiError(response.status, { code, message });
}

/** CSV 본문은 JSON이 아니어서 공통 클라이언트를 쓰지 않는다. */
export async function fetchSettlementCsv(yearMonth: string): Promise<Blob> {
  const response = await fetch(`/api/settlements/${yearMonth}/export`, { credentials: "include" });
  if (!response.ok) throw await toApiError(response);
  return response.blob();
}

export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
