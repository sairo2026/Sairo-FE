// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { rememberStepUpReturn, takeStepUpReturn } from "./step-up-return";

afterEach(() => {
  window.sessionStorage.clear();
});

describe("재인증 뒤 돌아갈 화면 기억", () => {
  it("기억한 화면을 한 번만 돌려준다", () => {
    rememberStepUpReturn("/settings/office/close?step=2", 1_000);
    expect(takeStepUpReturn(2_000)).toBe("/settings/office/close?step=2");
    expect(takeStepUpReturn(2_000)).toBe("/");
  });

  it("기억한 화면이 없으면 첫 화면을 돌려준다", () => {
    expect(takeStepUpReturn()).toBe("/");
  });

  it("15분이 지난 기록은 쓰지 않는다", () => {
    rememberStepUpReturn("/billing", 0);
    expect(takeStepUpReturn(15 * 60 * 1000 + 1)).toBe("/");
  });

  it("바깥 주소와 API 주소는 기억하지 않는다", () => {
    for (const path of [
      "https://example.com/a",
      "//example.com/a",
      "/\\example.com",
      "/api/me",
      "billing",
    ]) {
      rememberStepUpReturn(path);
      expect(takeStepUpReturn()).toBe("/");
    }
  });

  it("손상된 기록은 첫 화면으로 돌린다", () => {
    window.sessionStorage.setItem("sairo-step-up-return", "{broken");
    expect(takeStepUpReturn()).toBe("/");
    window.sessionStorage.setItem(
      "sairo-step-up-return",
      JSON.stringify({ path: "//example.com", savedAt: Date.now() }),
    );
    expect(takeStepUpReturn()).toBe("/");
  });
});
