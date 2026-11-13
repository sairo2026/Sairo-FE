import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import { errorResponse, mockErrors } from "../error-responses";
import { requireMockOps } from "./ops-session";

type MockTransfer = {
  transferId: number;
  officeId: number;
  officeName: string;
  fromDisplayName: string;
  toDisplayName: string;
  status: "PENDING" | "UNDER_REVIEW" | "COMPLETED" | "REJECTED" | "WITHDRAWN" | "EXPIRED";
  requestedAt: string;
  acceptDeadlineAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
};

const DAY = 86_400_000;

function at(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function seed(): MockTransfer[] {
  return [
    {
      transferId: 41,
      officeId: 7,
      officeName: "한강공인중개사사무소",
      fromDisplayName: "김대표",
      toDisplayName: "이중개",
      status: "UNDER_REVIEW",
      requestedAt: at(-3 * DAY),
      acceptDeadlineAt: at(4 * DAY),
      acceptedAt: at(-1 * DAY),
      completedAt: null,
    },
    {
      transferId: 42,
      officeId: 8,
      officeName: "정릉공인중개사사무소",
      fromDisplayName: "박대표",
      toDisplayName: "최중개",
      status: "UNDER_REVIEW",
      requestedAt: at(-2 * DAY),
      acceptDeadlineAt: at(5 * DAY),
      acceptedAt: at(-12 * 3_600_000),
      completedAt: null,
    },
    {
      transferId: 43,
      officeId: 9,
      officeName: "마포공인중개사사무소",
      fromDisplayName: "정대표",
      toDisplayName: "한중개",
      status: "PENDING",
      requestedAt: at(-1 * DAY),
      acceptDeadlineAt: at(6 * DAY),
      acceptedAt: null,
      completedAt: null,
    },
    {
      transferId: 40,
      officeId: 42,
      officeName: "사무소 예시",
      fromDisplayName: "오대표",
      toDisplayName: "윤중개",
      status: "COMPLETED",
      requestedAt: at(-10 * DAY),
      acceptDeadlineAt: at(-3 * DAY),
      acceptedAt: at(-9 * DAY),
      completedAt: at(-8 * DAY),
    },
  ];
}

const state = { transfers: seed() };

export function resetMockOwnerTransfers(): void {
  state.transfers = seed();
}

export const opsOwnerTransferHandlers: RequestHandler[] = [
  http.get("/api/ops/owner-transfers", ({ request }) => {
    const rejected = requireMockOps(["REVIEW"]);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "UNDER_REVIEW";
    const officeId = url.searchParams.get("officeId");
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 25);
    const rows = state.transfers
      .filter((row) => row.status === status)
      .filter((row) => !officeId || String(row.officeId) === officeId)
      .sort(
        (a, b) =>
          Date.parse(a.acceptedAt ?? a.requestedAt) - Date.parse(b.acceptedAt ?? b.requestedAt),
      );
    return HttpResponse.json({
      items: rows.slice(page * size, page * size + size),
      page,
      size,
      totalElements: rows.length,
    });
  }),

  http.post("/api/ops/owner-transfers/:transferId/approve", ({ params }) => {
    const rejected = requireMockOps(["REVIEW"]);
    if (rejected) return rejected;
    const row = state.transfers.find((item) => String(item.transferId) === params.transferId);
    if (!row) return mockErrors.notFound();
    if (row.status !== "UNDER_REVIEW") {
      return errorResponse(409, "INVALID_TRANSITION", "운영자 승인을 기다리는 건이 아닙니다.");
    }
    row.status = "COMPLETED";
    row.completedAt = new Date().toISOString();
    return HttpResponse.json({
      transferId: row.transferId,
      status: "COMPLETED",
      completedAt: row.completedAt,
    });
  }),
];
