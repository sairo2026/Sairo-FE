// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkDuplicateAddress, createProperty } from "../api/property.api";
import { PropertyForm } from "./property-form";

const push = vi.fn();
const back = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back, refresh }),
}));

vi.mock("../api/property.api", () => ({
  checkDuplicateAddress: vi.fn(),
  createProperty: vi.fn(),
  updateProperty: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function fillAddressAndSubmit(address: string) {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("매물의 주소를 입력해 주세요."), address);
  await user.click(screen.getByRole("button", { name: "등록" }));
  return user;
}

describe("PropertyForm duplicate address modal", () => {
  it("opens the modal, traps focus, and Escape returns focus to the submit button", async () => {
    vi.mocked(checkDuplicateAddress).mockResolvedValue([
      {
        propertyId: 9,
        address: "서울특별시 성북구 정릉로 123",
        addressDetail: null,
        propertyName: null,
      },
    ]);

    render(<PropertyForm mode="create" />);
    const submitButton = screen.getByRole("button", { name: "등록" });
    const user = await fillAddressAndSubmit("서울특별시 성북구 정릉로 123");

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(document.activeElement).toBe(dialog));

    const confirmButton = screen.getByRole("button", { name: "기존 매물 확인" });
    const registerAnywayButton = screen.getByRole("button", { name: "그래도 등록" });

    confirmButton.focus();
    await user.tab();
    expect(document.activeElement).toBe(registerAnywayButton);

    await user.tab();
    expect(document.activeElement).toBe(confirmButton);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(submitButton);
    expect(createProperty).not.toHaveBeenCalled();
  });

  it("registers the property when the user proceeds past the duplicate warning", async () => {
    vi.mocked(checkDuplicateAddress).mockResolvedValue([
      {
        propertyId: 9,
        address: "서울특별시 성북구 정릉로 123",
        addressDetail: null,
        propertyName: null,
      },
    ]);
    vi.mocked(createProperty).mockResolvedValue({
      propertyId: 10,
      address: "서울특별시 성북구 정릉로 123",
      addressDetail: null,
      propertyName: null,
      dealType: "MONTHLY",
      createdAt: "2026-01-01T00:00:00Z",
    });

    render(<PropertyForm mode="create" />);
    const user = await fillAddressAndSubmit("서울특별시 성북구 정릉로 123");
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "그래도 등록" }));

    await waitFor(() => expect(createProperty).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith("/properties");
  });

  it("registers directly without a modal when the address is not a duplicate", async () => {
    vi.mocked(checkDuplicateAddress).mockResolvedValue([]);
    vi.mocked(createProperty).mockResolvedValue({
      propertyId: 11,
      address: "서울특별시 강남구 테헤란로 1",
      addressDetail: null,
      propertyName: null,
      dealType: "MONTHLY",
      createdAt: "2026-01-01T00:00:00Z",
    });

    render(<PropertyForm mode="create" />);
    await fillAddressAndSubmit("서울특별시 강남구 테헤란로 1");

    await waitFor(() => expect(createProperty).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
