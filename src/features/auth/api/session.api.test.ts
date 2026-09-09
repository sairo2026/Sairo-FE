import { describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/shared/api/client";
import { checkSession } from "./session.api";

vi.mock("@/shared/api/client", () => ({
  apiFetch: vi.fn(),
}));

describe("checkSession", () => {
  it("HOME-01로 현재 세션의 유효성을 확인한다", async () => {
    vi.mocked(apiFetch).mockResolvedValue({});

    await checkSession();

    expect(apiFetch).toHaveBeenCalledWith("/api/home");
  });
});
