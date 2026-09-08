// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getHomeSummary } from "@/features/coordination/api/coordination.api";
import { HomeDashboard } from "./home-dashboard";

vi.mock("@/features/coordination/api/coordination.api", () => ({
  getHomeSummary: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HomeDashboard", () => {
  it("카드 3종과 임장 조율 현황 6단계를 보여준다", async () => {
    vi.mocked(getHomeSummary).mockResolvedValue({
      todayVisitCount: 6,
      inProgressCoordinationCount: 1,
      contractExpiringD90Count: 0,
      coordinationStatusCounts: {
        tenantChecking: 1,
        buyerDeliveryRequired: 0,
        buyerChecking: 0,
        finalConfirmationRequired: 0,
        scheduleConfirmed: 0,
        visitCompleted: 0,
      },
    });
    render(<HomeDashboard />);

    await screen.findByText("오늘 임장 목록");
    expect(screen.getByText("6")).not.toBeNull();
    expect(screen.getByText("임장 조율 중")).not.toBeNull();
    expect(screen.getByText("계약 만기 D-90")).not.toBeNull();
    expect(screen.getByText("세입자 확인 중")).not.toBeNull();
    expect(screen.getByText("구매자 전달 필요")).not.toBeNull();
    expect(screen.getByText("구매자 확인 중")).not.toBeNull();
    expect(screen.getByText("최종 확정 필요")).not.toBeNull();
    expect(screen.getByText("확정 완료")).not.toBeNull();
    expect(screen.getByText("임장 완료")).not.toBeNull();
  });

  it("조회에 실패하면 다시 시도 버튼을 보여준다", async () => {
    vi.mocked(getHomeSummary).mockRejectedValue(new Error("network"));
    render(<HomeDashboard />);

    await screen.findByText("정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
  });
});
