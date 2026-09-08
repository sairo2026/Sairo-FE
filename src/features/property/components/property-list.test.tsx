// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getProperties } from "../api/property.api";
import { PropertyList } from "./property-list";

vi.mock("../api/property.api", () => ({
  getProperties: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PropertyList", () => {
  it("renders the fetched properties", async () => {
    vi.mocked(getProperties).mockResolvedValue([
      {
        propertyId: 1,
        propertyName: "정릉 매물",
        address: "서울특별시 성북구 정릉로 123",
        addressDetail: null,
        dealType: "MONTHLY",
      },
    ]);

    render(<PropertyList />);

    await screen.findByText("정릉 매물");
  });

  it("shows an empty state when there are no properties", async () => {
    vi.mocked(getProperties).mockResolvedValue([]);

    render(<PropertyList />);

    await screen.findByText("등록된 매물이 없습니다.");
  });

  it("shows a retry button on load failure and refetches on click", async () => {
    vi.mocked(getProperties).mockRejectedValueOnce(new Error("network error"));
    vi.mocked(getProperties).mockResolvedValueOnce([
      {
        propertyId: 2,
        propertyName: "회기 매물",
        address: "서울특별시 동대문구 회기로 1",
        addressDetail: null,
        dealType: "SALE",
      },
    ]);

    render(<PropertyList />);

    const retryButton = await screen.findByRole("button", { name: "다시 시도" });
    await userEvent.click(retryButton);

    await screen.findByText("회기 매물");
  });

  it("filters properties by the search query", async () => {
    vi.mocked(getProperties).mockResolvedValue([
      {
        propertyId: 1,
        propertyName: "정릉 매물",
        address: "서울특별시 성북구 정릉로 123",
        addressDetail: null,
        dealType: "MONTHLY",
      },
      {
        propertyId: 2,
        propertyName: "회기 매물",
        address: "서울특별시 동대문구 회기로 1",
        addressDetail: null,
        dealType: "SALE",
      },
    ]);

    render(<PropertyList />);
    await screen.findByText("정릉 매물");

    await userEvent.type(screen.getByPlaceholderText("매물의 주소나 이름을 검색하세요."), "회기");

    await waitFor(() => expect(screen.queryByText("정릉 매물")).toBeNull());
    expect(screen.getByText("회기 매물")).not.toBeNull();
  });
});
