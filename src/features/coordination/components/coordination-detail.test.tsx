// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelCoordination,
  completeVisit,
  confirmCoordination,
  getCoordinationDetail,
} from "../api/coordination.api";
import { formatCandidateLabelFromIso } from "../model/coordination";
import type { CoordinationDetailResult } from "../schemas/coordination.schema";
import { CoordinationDetail } from "./coordination-detail";

const CANDIDATE_100_ISO = "2026-09-20T01:30:00Z";
const CANDIDATE_101_ISO = "2026-09-20T02:30:00Z";
const CANDIDATE_100_LABEL = formatCandidateLabelFromIso(CANDIDATE_100_ISO);

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../api/coordination.api", () => ({
  getCoordinationDetail: vi.fn(),
  confirmCoordination: vi.fn(),
  completeVisit: vi.fn(),
  cancelCoordination: vi.fn(),
}));

function baseDetail(overrides: Partial<CoordinationDetailResult> = {}): CoordinationDetailResult {
  return {
    coordinationId: 1,
    property: {
      propertyId: 5,
      address: "서울특별시 성북구 정릉로 123",
      addressDetail: null,
      propertyName: null,
      dealType: "MONTHLY",
    },
    status: "TENANT_CHECKING",
    createdAt: "2026-09-01T00:00:00Z",
    scheduledAt: null,
    confirmedAt: null,
    candidateTimes: [
      { candidateTimeId: 100, startsAt: CANDIDATE_100_ISO },
      { candidateTimeId: 101, startsAt: CANDIDATE_101_ISO },
    ],
    tenantResponse: {
      responseId: 10,
      role: "TENANT",
      name: "김세입자",
      phone: "010-1234-5678",
      result: "WAITING",
      offeredCandidateIds: [100, 101],
      selectedCandidateIds: [],
      submittedAt: null,
      customerLinkUrl: "https://app.sairo.agency/visit-responses/tenant-token",
      linkExpiresAt: "2026-09-27T00:00:00Z",
    },
    buyerResponses: [],
    ...overrides,
  };
}

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CoordinationDetail", () => {
  it("세입자 확인 중 상태에서는 대기 안내와 재시작 없는 화면을 보여준다", async () => {
    vi.mocked(getCoordinationDetail).mockResolvedValue(baseDetail());
    render(<CoordinationDetail coordinationId={1} />);

    await screen.findByText("세입자가 링크를 받고 날짜와 시간을 선택하는 중입니다.");
    expect(screen.queryByText("일정 최종 확정")).toBeNull();
  });

  it("진행 중 상태에서도 임장 조율 목록으로 돌아가는 링크를 보여준다", async () => {
    vi.mocked(getCoordinationDetail).mockResolvedValue(baseDetail());
    render(<CoordinationDetail coordinationId={1} />);

    const backLink = await screen.findByRole("link", { name: "← 임장 조율 목록으로" });
    expect(backLink.getAttribute("href")).toBe("/coordinations");
  });

  it("세입자가 가능한 시간이 없으면 경고 문구와 조율 취소 버튼만 보여준다", async () => {
    vi.mocked(getCoordinationDetail).mockResolvedValue(
      baseDetail({
        status: "TENANT_CHECKING",
        tenantResponse: {
          ...baseDetail().tenantResponse,
          result: "NONE_AVAILABLE",
        },
      }),
    );
    render(<CoordinationDetail coordinationId={1} />);

    await screen.findByText(
      "세입자가 위 선택지 중 가능한 시간이 없다고 답변했습니다. 새로운 후보를 선택해 다시 요청해 주세요.",
    );
    expect(screen.queryByText("링크 다시 보기")).toBeNull();
    expect(screen.queryByRole("button", { name: "재시작" })).toBeNull();
    expect(screen.queryByText("구매희망자님의 선택")).toBeNull();
    expect(screen.getAllByRole("button", { name: "조율 취소" }).length).toBe(1);
  });

  it("세입자가 가능한 시간이 없으면 조율 취소 버튼을 눌러 실제 취소 API를 호출하고 목록으로 이동한다", async () => {
    vi.mocked(getCoordinationDetail).mockResolvedValue(
      baseDetail({
        status: "TENANT_CHECKING",
        tenantResponse: {
          ...baseDetail().tenantResponse,
          result: "NONE_AVAILABLE",
        },
      }),
    );
    vi.mocked(cancelCoordination).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CoordinationDetail coordinationId={1} />);

    const cancelButton = await screen.findByRole("button", { name: "조율 취소" });
    expect(cancelButton.hasAttribute("disabled")).toBe(false);
    await user.click(cancelButton);

    expect(cancelCoordination).toHaveBeenCalledWith(1);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/coordinations"));
    expect(completeVisit).not.toHaveBeenCalled();
  });

  it("조율 취소 API가 실패하면 오류 문구를 보여주고 버튼을 유지한다", async () => {
    vi.mocked(getCoordinationDetail).mockResolvedValue(
      baseDetail({
        status: "TENANT_CHECKING",
        tenantResponse: {
          ...baseDetail().tenantResponse,
          result: "NONE_AVAILABLE",
        },
      }),
    );
    vi.mocked(cancelCoordination).mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    render(<CoordinationDetail coordinationId={1} />);

    const cancelButton = await screen.findByRole("button", { name: "조율 취소" });
    await user.click(cancelButton);

    await screen.findByText("조율 취소를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.");
    expect(screen.getByRole("button", { name: "조율 취소" })).not.toBeNull();
  });

  it("구매희망자는 가능한 시간 없음이어도 재시작·조율 취소 버튼을 보여주지 않는다", async () => {
    vi.mocked(getCoordinationDetail).mockResolvedValue(
      baseDetail({
        status: "BUYER_CHECKING",
        tenantResponse: {
          ...baseDetail().tenantResponse,
          result: "AVAILABLE_SUBMITTED",
          selectedCandidateIds: [100],
        },
        buyerResponses: [
          {
            responseId: 20,
            role: "BUYER",
            name: null,
            phone: null,
            result: "NONE_AVAILABLE",
            offeredCandidateIds: [100],
            selectedCandidateIds: [],
            submittedAt: "2026-09-05T00:00:00Z",
            customerLinkUrl: null,
            linkExpiresAt: null,
          },
        ],
      }),
    );
    render(<CoordinationDetail coordinationId={1} />);

    await screen.findByText("구매희망자가 위 선택지 중 가능한 시간이 없다고 답변했습니다.");
    expect(screen.queryByRole("button", { name: "재시작" })).toBeNull();
    const cancelButton = screen.getByRole("button", { name: "조율 취소" });
    expect(cancelButton.hasAttribute("disabled")).toBe(true);
  });

  it("최종 확정 필요 상태에서 구매희망자와 후보를 선택해 확정할 수 있다", async () => {
    vi.mocked(getCoordinationDetail).mockResolvedValue(
      baseDetail({
        status: "FINAL_CONFIRMATION_REQUIRED",
        tenantResponse: {
          ...baseDetail().tenantResponse,
          result: "AVAILABLE_SUBMITTED",
          selectedCandidateIds: [100, 101],
        },
        buyerResponses: [
          {
            responseId: 20,
            role: "BUYER",
            name: null,
            phone: null,
            result: "AVAILABLE_SUBMITTED",
            offeredCandidateIds: [100, 101],
            selectedCandidateIds: [100],
            submittedAt: "2026-09-05T00:00:00Z",
            customerLinkUrl: "https://app.sairo.agency/visit-responses/buyer-token",
            linkExpiresAt: "2026-09-27T00:00:00Z",
          },
        ],
      }),
    );
    vi.mocked(confirmCoordination).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CoordinationDetail coordinationId={1} />);

    await user.click(await screen.findByRole("button", { name: CANDIDATE_100_LABEL }));
    await user.click(screen.getByRole("button", { name: "일정 최종 확정" }));

    expect(confirmCoordination).toHaveBeenCalledWith(1, {
      buyerResponseId: 20,
      candidateTimeId: 100,
    });
  });

  it("확정 완료 상태에서 임장 완료 버튼을 누르면 임장 완료 처리를 요청한다", async () => {
    vi.mocked(getCoordinationDetail).mockResolvedValue(
      baseDetail({
        status: "SCHEDULE_CONFIRMED",
        scheduledAt: "2026-09-22T10:30:00Z",
        tenantResponse: {
          ...baseDetail().tenantResponse,
          result: "AVAILABLE_SUBMITTED",
          selectedCandidateIds: [100],
        },
      }),
    );
    vi.mocked(completeVisit).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CoordinationDetail coordinationId={1} />);

    const completeButton = await screen.findByRole("button", { name: "임장 완료" });
    await user.click(completeButton);

    expect(completeVisit).toHaveBeenCalledWith(1);
  });

  it("확정 완료 상태에서는 임장 완료 외 다른 조작 버튼을 두지 않는다", async () => {
    vi.mocked(getCoordinationDetail).mockResolvedValue(
      baseDetail({
        status: "SCHEDULE_CONFIRMED",
        scheduledAt: "2026-09-22T10:30:00Z",
        tenantResponse: {
          ...baseDetail().tenantResponse,
          result: "AVAILABLE_SUBMITTED",
          selectedCandidateIds: [100],
        },
        buyerResponses: [
          {
            responseId: 20,
            role: "BUYER",
            name: null,
            phone: null,
            result: "CONFIRMED",
            offeredCandidateIds: [100, 101],
            selectedCandidateIds: [100],
            submittedAt: "2026-09-05T00:00:00Z",
            customerLinkUrl: "https://app.sairo.agency/visit-responses/buyer-token",
            linkExpiresAt: "2026-09-27T00:00:00Z",
          },
          {
            responseId: 21,
            role: "BUYER",
            name: null,
            phone: null,
            result: "NOT_SELECTED",
            offeredCandidateIds: [100, 101],
            selectedCandidateIds: [],
            submittedAt: "2026-09-05T00:00:00Z",
            customerLinkUrl: "https://app.sairo.agency/visit-responses/buyer-token-2",
            linkExpiresAt: "2026-09-27T00:00:00Z",
          },
        ],
      }),
    );
    render(<CoordinationDetail coordinationId={1} />);

    await screen.findByRole("button", { name: "임장 완료" });
    expect(screen.queryByText("조율 취소")).toBeNull();
    expect(screen.queryByText("🔗 세입자용 링크")).toBeNull();
    expect(screen.queryByText("🔗 구매희망자용 링크")).toBeNull();
    expect(screen.queryByText("+ 구매희망자 링크 추가 생성")).toBeNull();
    expect(screen.queryByText("링크 다시 보기")).toBeNull();
  });

  it("임장 완료 상태에서는 조율 취소 없이 목록·홈 이동 CTA만 보여준다", async () => {
    vi.mocked(getCoordinationDetail).mockResolvedValue(
      baseDetail({
        status: "VISIT_COMPLETED",
        scheduledAt: "2026-09-22T10:30:00Z",
        tenantResponse: {
          ...baseDetail().tenantResponse,
          result: "AVAILABLE_SUBMITTED",
          selectedCandidateIds: [100],
        },
        buyerResponses: [
          {
            responseId: 20,
            role: "BUYER",
            name: null,
            phone: null,
            result: "CONFIRMED",
            offeredCandidateIds: [100, 101],
            selectedCandidateIds: [100],
            submittedAt: "2026-09-05T00:00:00Z",
            customerLinkUrl: "https://app.sairo.agency/visit-responses/buyer-token",
            linkExpiresAt: "2026-09-27T00:00:00Z",
          },
        ],
      }),
    );
    render(<CoordinationDetail coordinationId={1} />);

    await screen.findByText("임장 조율 목록으로");
    expect(screen.getByText("홈으로")).not.toBeNull();
    expect(screen.queryByText("조율 취소")).toBeNull();
    expect(screen.queryByRole("button", { name: "임장 완료" })).toBeNull();
    expect(screen.queryByText("🔗 세입자용 링크")).toBeNull();
    expect(screen.queryByText("🔗 구매희망자용 링크")).toBeNull();
    expect(screen.queryByText("링크 다시 보기")).toBeNull();
  });

  it("구매희망자 링크가 이미 있으면 추가 생성 진입점을 보여주지 않는다", async () => {
    vi.mocked(getCoordinationDetail).mockResolvedValue(
      baseDetail({
        status: "BUYER_CHECKING",
        buyerResponses: [
          {
            responseId: 20,
            role: "BUYER",
            name: null,
            phone: null,
            result: "WAITING",
            offeredCandidateIds: [100],
            selectedCandidateIds: [],
            submittedAt: null,
            customerLinkUrl: "https://app.sairo.agency/visit-responses/buyer-token-1",
            linkExpiresAt: "2026-09-27T00:00:00Z",
          },
        ],
      }),
    );
    render(<CoordinationDetail coordinationId={1} />);

    await screen.findByText("구매희망자가 링크를 받고 날짜와 시간을 선택하는 중입니다.");
    expect(screen.queryByText("🔗 구매희망자용 링크")).toBeNull();
    expect(screen.queryByText("+ 구매희망자 링크 추가 생성")).toBeNull();
  });

  it("화면이 열려 있는 동안 주기적으로 상세 조회를 다시 호출한다", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(getCoordinationDetail).mockResolvedValue(baseDetail());
      render(<CoordinationDetail coordinationId={1} />);

      await vi.waitFor(() => expect(getCoordinationDetail).toHaveBeenCalledTimes(1));

      await vi.advanceTimersByTimeAsync(8_000);
      expect(getCoordinationDetail).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(8_000);
      expect(getCoordinationDetail).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
