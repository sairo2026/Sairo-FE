import { apiFetch } from "@/shared/api/client";
import { parsePublicVisitResponse } from "../schemas/visit-response.schema";

export async function getVisitResponse(token: string) {
  return parsePublicVisitResponse(
    await apiFetch<unknown>(`/api/public/visit-responses/${encodeURIComponent(token)}`),
  );
}

export async function submitAvailableTimes(token: string, candidateTimeIds: number[]) {
  return parsePublicVisitResponse(
    await apiFetch<unknown>(
      `/api/public/visit-responses/${encodeURIComponent(token)}/available-times`,
      { method: "POST", body: { candidateTimeIds } },
    ),
  );
}

export async function submitNoAvailability(token: string) {
  return parsePublicVisitResponse(
    await apiFetch<unknown>(
      `/api/public/visit-responses/${encodeURIComponent(token)}/no-availability`,
      { method: "POST" },
    ),
  );
}
