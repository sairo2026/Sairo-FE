// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCoordination, getCoordinationProperty } from "../api/coordination.api";
import { CoordinationRequestFlow } from "./coordination-request-flow";

const push = vi.fn();
const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back, refresh: vi.fn() }),
}));

vi.mock("../api/coordination.api", () => ({
  getCoordinationProperty: vi.fn(),
  createCoordination: vi.fn(),
}));

const property = {
  propertyId: 1,
  propertyName: "정릉 매물",
  address: "서울특별시 성북구 정릉로 123",
  addressDetail: "202호",
  dealType: "MONTHLY" as const,
};

beforeEach(() => {
  vi.mocked(getCoordinationProperty).mockResolvedValue(property);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function goToCandidateTimesStep() {
  const user = userEvent.setup();
  render(<CoordinationRequestFlow propertyId={1} />);
  await screen.findByText("서울특별시 성북구 정릉로 123");

  await user.type(
    screen.getByPlaceholderText("임장을 희망하는 고객의 이름을 입력해 주세요."),
    "뛩뛩",
  );
  await user.type(
    screen.getByPlaceholderText("임장을 희망하는 고객의 연락처를 입력해 주세요."),
    "010-8888-8888",
  );
  await user.click(screen.getByRole("button", { name: "다음" }));
  await screen.findByText("임장 후보 시간 등록");
  return user;
}

async function selectAFutureSlot(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "다음 달" }));
  await user.click(screen.getByRole("button", { name: "15" }));
  const slotButtons = screen
    .getAllByRole("button")
    .filter((button) => /^\d{2}:\d{2}$/.test(button.textContent ?? ""));
  const enabledSlot = slotButtons.find((button) => !button.hasAttribute("disabled"));
  if (!enabledSlot) throw new Error("선택 가능한 시간 슬롯이 없습니다.");
  await user.click(enabledSlot);
}

describe("CoordinationRequestFlow", () => {
  it("완료 버튼은 후보 시간을 하나도 고르지 않으면 비활성 상태다", async () => {
    await goToCandidateTimesStep();
    const finishButton = screen.getByRole("button", { name: "완료" }) as HTMLButtonElement;
    expect(finishButton.disabled).toBe(true);
  });

  it("세입자 정보와 후보 시간을 제출하면 링크 생성 팝업이 뜬다", async () => {
    vi.mocked(createCoordination).mockResolvedValue({
      coordinationId: 10,
      status: "TENANT_CHECKING",
      tenantResponseId: 20,
      customerLinkUrl: "https://app.sairo.agency/visit-responses/token123",
      linkExpiresAt: "2026-09-15T00:00:00Z",
    });

    const user = await goToCandidateTimesStep();
    await selectAFutureSlot(user);

    await user.click(screen.getByRole("button", { name: "완료" }));

    await screen.findByText("임장 조율 링크가 생성되었습니다.");
    expect(createCoordination).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ tenantName: "뛩뛩", tenantPhone: "010-8888-8888" }),
    );
  });

  it("복사하지 않고 완료를 누르면 확인창을 띄우고, 취소하면 팝업이 유지된다", async () => {
    vi.mocked(createCoordination).mockResolvedValue({
      coordinationId: 10,
      status: "TENANT_CHECKING",
      tenantResponseId: 20,
      customerLinkUrl: "https://app.sairo.agency/visit-responses/token123",
      linkExpiresAt: "2026-09-15T00:00:00Z",
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    const user = await goToCandidateTimesStep();
    await selectAFutureSlot(user);
    await user.click(screen.getByRole("button", { name: "완료" }));
    await screen.findByText("임장 조율 링크가 생성되었습니다.");

    await user.click(screen.getByRole("button", { name: "완료" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    await screen.findByText("임장 조율 링크가 생성되었습니다.");
  });

  it("복사를 완료하면 확인창 없이 바로 완료 처리된다", async () => {
    vi.mocked(createCoordination).mockResolvedValue({
      coordinationId: 10,
      status: "TENANT_CHECKING",
      tenantResponseId: 20,
      customerLinkUrl: "https://app.sairo.agency/visit-responses/token123",
      linkExpiresAt: "2026-09-15T00:00:00Z",
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const user = await goToCandidateTimesStep();
    await selectAFutureSlot(user);
    await user.click(screen.getByRole("button", { name: "완료" }));
    await screen.findByText("임장 조율 링크가 생성되었습니다.");

    await user.click(screen.getByRole("button", { name: "복사" }));
    await screen.findByText("복사가 완료됐습니다.");

    await user.click(screen.getByRole("button", { name: "완료" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/properties/1"));
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
