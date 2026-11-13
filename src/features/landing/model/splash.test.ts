// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SPLASH_BOOT_SCRIPT,
  SPLASH_STORAGE_KEY,
  finishSplash,
  markSplashPhase,
  readServerSplashPhase,
  readSplashPhase,
  subscribeSplashPhase,
} from "./splash";

function stubMotionPreference(isReduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: isReduced, media: query })),
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  delete document.documentElement.dataset.splash;
  stubMotionPreference(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("로고 스플래시 표시 판정", () => {
  it("세션의 첫 방문이면 스플래시를 재생하고 본 기록을 남긴다", () => {
    markSplashPhase(SPLASH_STORAGE_KEY);
    expect(document.documentElement.dataset.splash).toBe("play");
    expect(window.sessionStorage.getItem(SPLASH_STORAGE_KEY)).toBe("1");
  });

  it("같은 세션에서 다시 열면 스플래시를 생략한다", () => {
    markSplashPhase(SPLASH_STORAGE_KEY);
    markSplashPhase(SPLASH_STORAGE_KEY);
    expect(document.documentElement.dataset.splash).toBe("seen");
  });

  it("모션 감소 설정이면 첫 방문이어도 스플래시를 생략한다", () => {
    stubMotionPreference(true);
    markSplashPhase(SPLASH_STORAGE_KEY);
    expect(document.documentElement.dataset.splash).toBe("seen");
  });

  it("세션 저장소를 쓸 수 없으면 스플래시를 생략한다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    markSplashPhase(SPLASH_STORAGE_KEY);
    expect(document.documentElement.dataset.splash).toBe("seen");
  });

  it("문서에 넣는 시작 스크립트가 같은 판정을 한다", () => {
    new Function(SPLASH_BOOT_SCRIPT)();
    expect(document.documentElement.dataset.splash).toBe("play");
    new Function(SPLASH_BOOT_SCRIPT)();
    expect(document.documentElement.dataset.splash).toBe("seen");
  });
});

describe("로고 스플래시 상태", () => {
  it("서버 렌더링과 시작 스크립트가 재생으로 정한 문서에서만 재생 상태다", () => {
    expect(readServerSplashPhase()).toBe("play");
    expect(readSplashPhase()).toBe("seen");
    document.documentElement.dataset.splash = "play";
    expect(readSplashPhase()).toBe("play");
  });

  it("끝내면 본 상태로 바꾸고 구독자에게 한 번만 알린다", () => {
    document.documentElement.dataset.splash = "play";
    const listener = vi.fn();
    const unsubscribe = subscribeSplashPhase(listener);
    finishSplash();
    finishSplash();
    expect(readSplashPhase()).toBe("seen");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
