// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import { getProperty } from "../api/property.api";
import { PropertyDetail } from "./property-detail";

vi.mock("../api/property.api", () => ({
  getProperty: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function apiError(status: number) {
  return new ApiError(status, { code: "ERROR", message: "실패", traceId: "trace-1" });
}

describe("PropertyDetail error branching", () => {
  it("renders the property once loaded", async () => {
    vi.mocked(getProperty).mockResolvedValue({
      propertyId: 1,
      propertyName: "정릉 매물",
      address: "서울특별시 성북구 정릉로 123",
      addressDetail: null,
      dealType: "MONTHLY",
      createdAt: "2026-01-01T00:00:00Z",
    });

    render(<PropertyDetail propertyId={1} />);

    await screen.findByText("서울특별시 성북구 정릉로 123");
  });

  it("prompts re-login on 401 without a retry button", async () => {
    vi.mocked(getProperty).mockRejectedValue(apiError(401));

    render(<PropertyDetail propertyId={1} />);

    await screen.findByText("로그인이 필요합니다.");
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });

  it("shows a permission message on 403", async () => {
    vi.mocked(getProperty).mockRejectedValue(apiError(403));

    render(<PropertyDetail propertyId={1} />);

    await screen.findByText("이 매물에 접근할 권한이 없습니다.");
  });

  it("shows a not-found message on 404", async () => {
    vi.mocked(getProperty).mockRejectedValue(apiError(404));

    render(<PropertyDetail propertyId={1} />);

    await screen.findByText("매물을 찾을 수 없습니다.");
  });

  it("shows a retry button on other failures and refetches on click", async () => {
    vi.mocked(getProperty).mockRejectedValueOnce(new Error("network error"));
    vi.mocked(getProperty).mockResolvedValueOnce({
      propertyId: 1,
      propertyName: "정릉 매물",
      address: "서울특별시 성북구 정릉로 123",
      addressDetail: null,
      dealType: "MONTHLY",
      createdAt: "2026-01-01T00:00:00Z",
    });

    render(<PropertyDetail propertyId={1} />);

    const retryButton = await screen.findByRole("button", { name: "다시 시도" });
    await userEvent.click(retryButton);

    await screen.findByText("서울특별시 성북구 정릉로 123");
  });
});
