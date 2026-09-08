// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCoordinationList } from "../api/coordination.api";
import { CoordinationList } from "./coordination-list";

vi.mock("../api/coordination.api", () => ({
  getCoordinationList: vi.fn(),
}));

const LIST_RESULT = {
  statusCounts: {
    tenantChecking: 1,
    buyerDeliveryRequired: 0,
    buyerChecking: 0,
    finalConfirmationRequired: 0,
    scheduleConfirmed: 1,
    visitCompleted: 0,
  },
  coordinations: [
    {
      coordinationId: 1,
      propertyAddress: "서울특별시 성북구 정릉로 123",
      tenantName: "김세입자",
      tenantPhone: "010-1234-5678",
      visitScheduledAt: null,
      status: "TENANT_CHECKING" as const,
    },
    {
      coordinationId: 2,
      propertyAddress: "서울특별시 강남구 테헤란로 10",
      tenantName: "박세입자",
      tenantPhone: "010-9999-0000",
      visitScheduledAt: "2026-09-22T10:30:00Z",
      status: "SCHEDULE_CONFIRMED" as const,
    },
  ],
};

beforeEach(() => {
  vi.mocked(getCoordinationList).mockResolvedValue(LIST_RESULT);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CoordinationList", () => {
  it("상태별 건수와 목록 행을 보여준다", async () => {
    render(<CoordinationList />);

    await screen.findByText("김세입자 / 010-1234-5678");
    expect(screen.getByText("박세입자 / 010-9999-0000")).not.toBeNull();
    expect(screen.getAllByText("세입자 확인 중").length).toBeGreaterThan(0);
    expect(screen.getAllByText("확정 완료").length).toBeGreaterThan(0);
  });

  it("검색어로 고객 이름이나 주소를 필터링한다", async () => {
    const user = userEvent.setup();
    render(<CoordinationList />);

    await screen.findByText("김세입자 / 010-1234-5678");
    await user.type(
      screen.getByPlaceholderText("매물의 주소나 고객 이름을 검색하세요."),
      "박세입자",
    );

    expect(screen.queryByText("김세입자 / 010-1234-5678")).toBeNull();
    expect(screen.getByText("박세입자 / 010-9999-0000")).not.toBeNull();
  });

  it("목록 조회에 실패하면 다시 시도 버튼을 보여준다", async () => {
    vi.mocked(getCoordinationList).mockReset();
    vi.mocked(getCoordinationList).mockRejectedValueOnce(new Error("network"));
    render(<CoordinationList />);

    await screen.findByText("임장 조율 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
  });
});
