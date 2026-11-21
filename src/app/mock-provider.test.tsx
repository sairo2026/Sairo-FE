// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";

const { start } = vi.hoisted(() => ({ start: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/mocks/browser", () => ({ worker: { start } }));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

it("StrictMode에서 효과가 다시 실행되어도 모의 API를 한 번만 시작한다", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "enabled");
  const { MockProvider } = await import("./mock-provider");

  render(
    <StrictMode>
      <MockProvider>
        <p>준비됨</p>
      </MockProvider>
    </StrictMode>,
  );

  expect(await screen.findByText("준비됨")).toBeDefined();
  expect(start).toHaveBeenCalledTimes(1);
});
