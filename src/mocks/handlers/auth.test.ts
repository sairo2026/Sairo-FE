// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiError, apiFetch } from "@/shared/api/client";
import { server, startMockServer } from "../server";
import { MOCK_ACTIVE_CONTEXT, resetMockAuthState, setMockAuthContext } from "./auth";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});
afterEach(() => {
  server.resetHandlers();
  resetMockAuthState();
});
afterAll(() => stopServer());

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("오류가 발생해야 한다");
}

function login(password: string) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: { email: "agent@example.com", password },
    skipAuthEvents: true,
  });
}

describe("모의 인증 핸들러", () => {
  it("로그인 상태의 접근 상태를 돌려주고 로그아웃 뒤에는 401을 돌려준다", async () => {
    await expect(apiFetch("/api/auth/context")).resolves.toEqual(MOCK_ACTIVE_CONTEXT);
    await apiFetch("/api/auth/logout", { method: "POST" });
    const error = await failure(apiFetch("/api/auth/context", { skipAuthEvents: true }));
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHENTICATED");
  });

  it("틀린 비밀번호는 401, 5번 틀린 뒤에는 429와 대기 시간을 돌려준다", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const error = await failure(login("wrong"));
      expect(error.code).toBe("INVALID_CREDENTIALS");
    }
    const locked = await failure(login("mock-password-1"));
    expect(locked.status).toBe(429);
    expect(locked.code).toBe("LOGIN_LOCKED");
    expect(locked.retryAfterSeconds).toBe(900);
  });

  it("맞는 비밀번호로 로그인하면 접근 상태를 돌려준다", async () => {
    setMockAuthContext(null);
    await expect(login("mock-password-1")).resolves.toMatchObject({ accessCondition: "ACTIVE" });
  });

  it("재동의가 필요한 상태를 만들고 동의하면 풀린다", async () => {
    setMockAuthContext({ ...MOCK_ACTIVE_CONTEXT, reconsentRequired: true });
    const before = await apiFetch<{ items: unknown[] }>("/api/me/terms-reconsent");
    expect(before.items).toHaveLength(1);
    await apiFetch("/api/me/terms-agreements", { method: "POST", body: {} });
    const after = await apiFetch<{ reconsentRequired: boolean }>("/api/auth/context");
    expect(after.reconsentRequired).toBe(false);
  });
});
