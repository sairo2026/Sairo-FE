// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPLASH_DURATION_MS } from "../model/splash";
import { LogoSplash } from "./logo-splash";

beforeEach(() => {
  delete document.documentElement.dataset.splash;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function playSplash() {
  document.documentElement.dataset.splash = "play";
  return render(<LogoSplash />);
}

describe("로고 스플래시", () => {
  it("재생 상태인 문서에서 로고를 보여주고 보조 기술에는 숨긴다", () => {
    playSplash();
    const splash = screen.getByTestId("logo-splash");
    expect(splash.getAttribute("aria-hidden")).toBe("true");
    expect(splash.querySelector("img")).not.toBeNull();
    expect(splash.querySelector("a, button, input, [tabindex]")).toBeNull();
  });

  it("정해진 시간이 지나면 스스로 사라지고 그 시간은 1초를 넘지 않는다", () => {
    vi.useFakeTimers();
    playSplash();
    expect(SPLASH_DURATION_MS).toBeLessThanOrEqual(1000);
    act(() => {
      vi.advanceTimersByTime(SPLASH_DURATION_MS - 1);
    });
    expect(screen.queryByTestId("logo-splash")).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("logo-splash")).toBeNull();
    expect(document.documentElement.dataset.splash).toBe("seen");
  });

  it.each([
    ["키 입력", () => fireEvent.keyDown(window, { key: "Tab" })],
    ["포인터 누름", () => fireEvent.pointerDown(window)],
    ["휠 스크롤", () => fireEvent.wheel(window)],
    ["화면 터치", () => fireEvent.touchStart(window)],
  ])("%s으로 바로 건너뛴다", (_label, interact) => {
    playSplash();
    act(() => {
      interact();
    });
    expect(screen.queryByTestId("logo-splash")).toBeNull();
  });

  it("이미 본 세션에서는 보여주지 않는다", () => {
    document.documentElement.dataset.splash = "seen";
    render(<LogoSplash />);
    expect(screen.queryByTestId("logo-splash")).toBeNull();
  });

  it("시작 스크립트가 돌지 않은 화면 내 이동에서는 보여주지 않는다", () => {
    render(<LogoSplash />);
    expect(screen.queryByTestId("logo-splash")).toBeNull();
  });

  it("한 번 사라진 뒤 다시 그려도 보여주지 않는다", () => {
    const view = playSplash();
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    view.unmount();
    render(<LogoSplash />);
    expect(screen.queryByTestId("logo-splash")).toBeNull();
  });
});
