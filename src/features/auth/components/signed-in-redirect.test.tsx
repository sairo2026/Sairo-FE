// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MOCK_ACTIVE_CONTEXT, resetMockAuthState, setMockAuthContext } from "@/mocks/handlers/auth";
import { server, startMockServer } from "@/mocks/server";
import { SignedInRedirect } from "./signed-in-redirect";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockAuthState();
  replace.mockClear();
});

afterAll(() => stopServer());

describe("이미 로그인한 사람의 로그인·가입 화면", () => {
  it("로그인한 상태면 접근 상태에 맞는 시작 화면으로 보낸다", async () => {
    render(<SignedInRedirect />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });

  it("가려던 화면이 있으면 그 화면으로 보낸다", async () => {
    render(<SignedInRedirect next="/properties" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/properties"));
  });

  it("사무소가 없는 계정은 사무소 시작 화면으로 보낸다", async () => {
    setMockAuthContext({
      ...MOCK_ACTIVE_CONTEXT,
      accessCondition: "PRE_VERIFICATION",
      officeId: null,
      role: null,
    });
    render(<SignedInRedirect />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/office/start"));
  });

  it("로그인하지 않았으면 화면을 그대로 둔다", async () => {
    setMockAuthContext(null);
    render(<SignedInRedirect />);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(replace).not.toHaveBeenCalled();
  });
});
