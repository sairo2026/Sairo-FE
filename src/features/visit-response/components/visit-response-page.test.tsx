// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import {
  getVisitResponse,
  submitAvailableTimes,
  submitNoAvailability,
} from "../api/visit-response.api";
import { VisitResponsePage } from "./visit-response-page";

vi.mock("../api/visit-response.api", () => ({
  getVisitResponse: vi.fn(),
  submitAvailableTimes: vi.fn(),
  submitNoAvailability: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function waitingResponse(overrides: Record<string, unknown> = {}) {
  return {
    officeName: "사이로중개사무소",
    propertySummary: {
      address: "서울특별시 성북구 정릉로 123",
      propertyName: null,
      dealType: "MONTHLY" as const,
    },
    role: "TENANT" as const,
    result: "WAITING" as const,
    candidateTimes: [
      { candidateTimeId: 1, startsAt: new Date(2026, 7, 20, 10, 30).toISOString() },
      { candidateTimeId: 2, startsAt: new Date(2026, 7, 20, 14, 0).toISOString() },
    ],
    selectedCandidateIds: [],
    scheduledAt: null,
    expiresAt: new Date(2026, 7, 27).toISOString(),
    ...overrides,
  };
}

describe("VisitResponsePage", () => {
  it("만료된 링크는 만료 안내를 보여준다", async () => {
    vi.mocked(getVisitResponse).mockRejectedValue(
      new ApiError(404, { code: "PUBLIC_LINK_NOT_FOUND", message: "만료", traceId: "t1" }),
    );

    render(<VisitResponsePage token="expired-token" />);

    await screen.findByText("이 링크는 만료되었습니다.");
  });

  it("가능한 시간을 선택해 제출하면 응답 완료 화면으로 전환된다", async () => {
    vi.mocked(getVisitResponse).mockResolvedValue(waitingResponse());
    vi.mocked(submitAvailableTimes).mockResolvedValue(
      waitingResponse({ result: "AVAILABLE_SUBMITTED", selectedCandidateIds: [1] }),
    );

    const user = userEvent.setup();
    render(<VisitResponsePage token="token123" />);

    const slotButton = await screen.findByText("8월 20일 오전 10:30");
    await user.click(slotButton);
    await user.click(screen.getByRole("button", { name: "제출" }));

    await screen.findByText("응답이 완료되었습니다. 감사합니다.");
    expect(submitAvailableTimes).toHaveBeenCalledWith("token123", [1]);
  });

  it("가능한 시간이 없음을 제출하면 대기 안내 화면으로 전환된다", async () => {
    vi.mocked(getVisitResponse).mockResolvedValue(waitingResponse());
    vi.mocked(submitNoAvailability).mockResolvedValue(
      waitingResponse({ result: "NONE_AVAILABLE" }),
    );

    const user = userEvent.setup();
    render(<VisitResponsePage token="token123" />);

    await screen.findByText("8월 20일 오전 10:30");
    await user.click(screen.getByRole("button", { name: "가능한 시간이 없음" }));

    await screen.findByText("가능한 시간이 없다고 응답하셨습니다.");
  });

  it("구매희망자 응답에는 가능한 시간이 없음 버튼을 보여주지 않는다", async () => {
    vi.mocked(getVisitResponse).mockResolvedValue(waitingResponse({ role: "BUYER" as const }));

    render(<VisitResponsePage token="token123" />);

    await screen.findByText("8월 20일 오전 10:30");
    expect(screen.queryByRole("button", { name: "가능한 시간이 없음" })).toBeNull();
  });

  it("확정된 응답은 최종 방문 일정을 보여준다", async () => {
    const scheduledAt = new Date(2026, 7, 20, 10, 30).toISOString();
    vi.mocked(getVisitResponse).mockResolvedValue(
      waitingResponse({ result: "CONFIRMED", scheduledAt }),
    );

    render(<VisitResponsePage token="token123" />);

    await screen.findByText("임장 일정이 확정되었습니다.");
    expect(screen.getByText("8월 20일 오전 10:30")).not.toBeNull();
  });
});
