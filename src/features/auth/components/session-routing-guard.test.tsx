// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import { checkSession } from "../api/session.api";
import { SessionRoutingGuard } from "./session-routing-guard";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("../api/session.api", () => ({
  checkSession: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SessionRoutingGuard", () => {
  it("세션 확인 전에는 보호된 화면을 숨기고 카드·스피너 스타일로 안내한다", () => {
    vi.mocked(checkSession).mockReturnValue(new Promise(() => undefined));

    const { container } = render(
      <SessionRoutingGuard>
        <p>보호된 화면</p>
      </SessionRoutingGuard>,
    );

    expect(screen.getByText("로그인 상태를 확인하는 중입니다.")).not.toBeNull();
    expect(screen.queryByText("보호된 화면")).toBeNull();
    expect(container.querySelector(".rounded-3xl.bg-white")).not.toBeNull();
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("HOME-01이 401을 반환하면 로그인 화면으로 대체 이동한다", async () => {
    vi.mocked(checkSession).mockRejectedValue(
      new ApiError(401, {
        code: "UNAUTHENTICATED",
        message: "로그인이 필요합니다.",
        traceId: "trace-id",
      }),
    );

    render(
      <SessionRoutingGuard>
        <p>보호된 화면</p>
      </SessionRoutingGuard>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("보호된 화면")).toBeNull();
  });

  it("세션이 유효하면 보호된 화면을 표시한다", async () => {
    vi.mocked(checkSession).mockResolvedValue(undefined);

    render(
      <SessionRoutingGuard>
        <p>보호된 화면</p>
      </SessionRoutingGuard>,
    );

    expect(await screen.findByText("보호된 화면")).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("401 외 조회 실패는 개별 화면이 자체 오류를 처리하도록 보호 화면을 표시한다", async () => {
    vi.mocked(checkSession).mockRejectedValue(new Error("network error"));

    render(
      <SessionRoutingGuard>
        <p>보호된 화면</p>
      </SessionRoutingGuard>,
    );

    expect(await screen.findByText("보호된 화면")).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
