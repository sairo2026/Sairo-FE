// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import { createBuyerLink } from "../api/coordination.api";
import { BuyerCoordinationLinkFlow } from "./buyer-coordination-link-flow";

vi.mock("../api/coordination.api", () => ({
  createBuyerLink: vi.fn(),
}));

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

describe("BuyerCoordinationLinkFlow", () => {
  it("클릭하면 구매자용 링크를 생성해 팝업으로 보여준다", async () => {
    vi.mocked(createBuyerLink).mockResolvedValue({
      buyerResponseId: 1,
      customerLinkUrl: "https://app.sairo.agency/visit-responses/buyer-token",
      linkExpiresAt: "2026-09-15T00:00:00Z",
      coordinationStatus: "BUYER_CHECKING",
    });
    const user = userEvent.setup();
    render(<BuyerCoordinationLinkFlow coordinationId={7} />);

    await user.click(screen.getByRole("button", { name: "구매희망자용 링크 생성" }));

    expect(createBuyerLink).toHaveBeenCalledWith(7);
    await screen.findByText("https://app.sairo.agency/visit-responses/buyer-token");
  });

  it("반복 실행해 여러 구매자 링크를 추가로 생성할 수 있다", async () => {
    vi.mocked(createBuyerLink).mockResolvedValue({
      buyerResponseId: 1,
      customerLinkUrl: "https://app.sairo.agency/visit-responses/buyer-token-1",
      linkExpiresAt: "2026-09-15T00:00:00Z",
      coordinationStatus: "BUYER_CHECKING",
    });
    const user = userEvent.setup();
    render(<BuyerCoordinationLinkFlow coordinationId={7} />);

    await user.click(screen.getByRole("button", { name: "구매희망자용 링크 생성" }));
    await screen.findByText("https://app.sairo.agency/visit-responses/buyer-token-1");
    await user.click(screen.getByRole("button", { name: "복사" }));
    await user.click(screen.getByRole("button", { name: "확인" }));

    vi.mocked(createBuyerLink).mockResolvedValue({
      buyerResponseId: 2,
      customerLinkUrl: "https://app.sairo.agency/visit-responses/buyer-token-2",
      linkExpiresAt: "2026-09-15T00:00:00Z",
      coordinationStatus: "BUYER_CHECKING",
    });
    await user.click(screen.getByRole("button", { name: "구매희망자용 링크 생성" }));

    expect(createBuyerLink).toHaveBeenCalledTimes(2);
    await screen.findByText("https://app.sairo.agency/visit-responses/buyer-token-2");
  });

  it("세입자가 아직 제출하지 않아 409가 나면 안내 문구를 보여준다", async () => {
    vi.mocked(createBuyerLink).mockRejectedValue(
      new ApiError(409, { code: "INVALID_TRANSITION", message: "잘못된 전이", traceId: "t-1" }),
    );
    const user = userEvent.setup();
    render(<BuyerCoordinationLinkFlow coordinationId={7} />);

    await user.click(screen.getByRole("button", { name: "구매희망자용 링크 생성" }));

    await screen.findByText(
      "세입자가 아직 가능한 시간을 제출하지 않았습니다. 세입자 응답 완료 후 다시 시도해주세요.",
    );
  });
});
