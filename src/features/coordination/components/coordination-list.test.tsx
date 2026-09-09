// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import { getCoordinationList } from "../api/coordination.api";
import { CoordinationList } from "./coordination-list";

let searchParamsString = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchParamsString),
}));

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
  searchParamsString = "";
  vi.mocked(getCoordinationList).mockResolvedValue(LIST_RESULT);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CoordinationList", () => {
  it("목록이 비어 있으면 정상적인 빈 상태를 보여준다", async () => {
    vi.mocked(getCoordinationList).mockResolvedValue({
      statusCounts: {
        tenantChecking: 0,
        buyerDeliveryRequired: 0,
        buyerChecking: 0,
        finalConfirmationRequired: 0,
        scheduleConfirmed: 0,
        visitCompleted: 0,
      },
      coordinations: [],
    });

    render(<CoordinationList />);

    await screen.findByText("진행 중인 임장 조율이 없습니다.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("인증되지 않은 응답이면 로그인 링크를 보여준다", async () => {
    vi.mocked(getCoordinationList).mockRejectedValue(
      new ApiError(401, { code: "UNAUTHORIZED", message: "인증 필요", traceId: "trace-1" }),
    );

    render(<CoordinationList />);

    await screen.findByText("로그인이 필요합니다.");
    expect(screen.getByRole("link", { name: "로그인하러 가기" }).getAttribute("href")).toBe(
      "/login",
    );
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });

  it("상태별 건수와 목록 행을 보여준다", async () => {
    render(<CoordinationList />);

    await screen.findByText("김세입자 / 010-1234-5678");
    expect(screen.getByText("박세입자 / 010-9999-0000")).not.toBeNull();
    expect(screen.getAllByText("세입자 확인 중").length).toBeGreaterThan(0);
    expect(screen.getAllByText("확정 완료").length).toBeGreaterThan(0);
  });

  it("상태 요약 박스는 홈 화면과 동일한 상태별 색상을 적용한다", async () => {
    render(<CoordinationList />);
    await screen.findByText("김세입자 / 010-1234-5678");

    const [tenantCheckingTileLabel] = screen.getAllByText("세입자 확인 중");
    expect(tenantCheckingTileLabel?.closest("button")?.className).toContain("bg-[#ffdde3]");
    const [scheduleConfirmedTileLabel] = screen.getAllByText("확정 완료");
    expect(scheduleConfirmedTileLabel?.closest("button")?.className).toContain("bg-[#dbe4ff]");
  });

  it("상태 요약 박스를 클릭하면 그 상태로 목록을 필터링하고, 다시 누르면 해제한다", async () => {
    const user = userEvent.setup();
    render(<CoordinationList />);
    await screen.findByText("김세입자 / 010-1234-5678");

    const [tenantCheckingTile] = screen.getAllByRole("button", { name: /세입자 확인 중/ });
    await user.click(tenantCheckingTile as HTMLElement);

    expect(screen.queryByText("박세입자 / 010-9999-0000")).toBeNull();
    expect(screen.getByText("김세입자 / 010-1234-5678")).not.toBeNull();

    await user.click(tenantCheckingTile as HTMLElement);
    expect(screen.getByText("박세입자 / 010-9999-0000")).not.toBeNull();
  });

  it("URL의 status 쿼리로 초기 필터를 적용한다", async () => {
    searchParamsString = "status=SCHEDULE_CONFIRMED";
    render(<CoordinationList />);

    await screen.findByText("박세입자 / 010-9999-0000");
    expect(screen.queryByText("김세입자 / 010-1234-5678")).toBeNull();
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
