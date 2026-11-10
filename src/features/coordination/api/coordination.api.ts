import { apiFetch } from "@/shared/api/client";
import { parseHomeSummaryResult } from "../schemas/coordination.schema";

export async function getHomeSummary() {
  return parseHomeSummaryResult(await apiFetch<unknown>("/api/home"));
}
