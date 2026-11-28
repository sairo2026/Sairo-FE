// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { takeInstallPrompt } from "@/shared/lib/install-prompt";
import InstallPage from "./page";

afterEach(() => {
  cleanup();
  takeInstallPrompt();
});

describe("PC 설치 화면", () => {
  it("설치와 웹 로그인·회원가입을 바로 선택할 수 있다", () => {
    render(<InstallPage />);

    expect(screen.getByRole("heading", { name: "사이로 시작하기" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PC에 설치하기" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "처음 화면으로 돌아가기" }).getAttribute("href")).toBe(
      "/welcome",
    );
    expect(screen.getByRole("link", { name: "사이로 첫 화면" }).getAttribute("href")).toBe(
      "/welcome",
    );
    expect(screen.getByRole("link", { name: "로그인하러 가기" }).getAttribute("href")).toBe(
      "/login",
    );
    expect(screen.getByRole("link", { name: "회원가입하러 가기" }).getAttribute("href")).toBe(
      "/signup",
    );
    expect(screen.getByText(/Chrome·Edge에서 설치하면 앱 창으로 열립니다/)).toBeTruthy();
  });

  it("브라우저 설치 이벤트가 있으면 버튼 한 번으로 설치 창을 연다", async () => {
    const user = userEvent.setup();
    const openPrompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: openPrompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    window.dispatchEvent(event);
    render(<InstallPage />);
    await user.click(screen.getByRole("button", { name: "PC에 설치하기" }));

    expect(openPrompt).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("설치가 진행 중입니다");
    const pendingButton = screen.getByRole("button", { name: "설치 진행 중" });
    expect(pendingButton.getAttribute("aria-disabled")).toBe("true");
    await user.click(pendingButton);
    expect(openPrompt).toHaveBeenCalledOnce();
    expect(screen.getByRole("status").textContent).toContain("설치가 진행 중입니다");

    act(() => window.dispatchEvent(new Event("appinstalled")));
    expect(screen.getByRole("status").textContent).toContain("설치된 사이로 앱");
    expect(document.activeElement).toBe(screen.getByRole("status"));
  });

  it("설치 이벤트가 없는 브라우저에서는 클릭 후 대체 경로를 보여준다", async () => {
    const user = userEvent.setup();
    render(<InstallPage />);

    await user.click(screen.getByRole("button", { name: "PC에 설치하기" }));

    expect(screen.getByRole("status").textContent).toContain("앱에서 열기");
    expect(screen.getByRole("status").textContent).toContain("설치 아이콘");
    expect(screen.getByRole("status").textContent).toContain("앱 설치");
  });

  it("같은 설치 안내를 다시 요청해도 상태 메시지를 새로 알린다", async () => {
    const user = userEvent.setup();
    render(<InstallPage />);
    const button = screen.getByRole("button", { name: "PC에 설치하기" });

    await user.click(button);
    const firstAnnouncement = screen.getByRole("status").firstElementChild;
    await user.click(button);

    expect(screen.getByRole("status").firstElementChild).not.toBe(firstAnnouncement);
    expect(screen.getByRole("status").textContent).toContain("앱에서 열기");
  });

  it("설치 창을 닫으면 실패로 오해시키지 않는다", async () => {
    const user = userEvent.setup();
    const openPrompt = vi.fn().mockResolvedValue(undefined);
    window.dispatchEvent(
      Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt: openPrompt,
        userChoice: Promise.resolve({ outcome: "dismissed" as const }),
      }),
    );
    render(<InstallPage />);

    await user.click(screen.getByRole("button", { name: "PC에 설치하기" }));

    expect(openPrompt).toHaveBeenCalledOnce();
    expect(screen.getByRole("status").textContent).toContain("나중에 주소창의 설치 아이콘으로");
  });

  it("설치 창 호출이 실패하면 브라우저 메뉴 경로를 안내한다", async () => {
    const user = userEvent.setup();
    window.dispatchEvent(
      Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt: vi.fn().mockRejectedValue(new Error("prompt unavailable")),
        userChoice: Promise.resolve({ outcome: "dismissed" as const }),
      }),
    );
    render(<InstallPage />);

    await user.click(screen.getByRole("button", { name: "PC에 설치하기" }));

    expect(screen.getByRole("status").textContent).toContain("설치 창을 열지 못했습니다");
  });

  it("브라우저 메뉴에서 설치했을 때 현재 포커스를 빼앗지 않는다", () => {
    render(<InstallPage />);
    const login = screen.getByRole("link", { name: "로그인하러 가기" });
    login.focus();

    act(() => window.dispatchEvent(new Event("appinstalled")));

    expect(screen.getByRole("status").textContent).toContain("설치된 사이로 앱");
    expect(document.activeElement).toBe(login);
  });

  it("설치 안내 버튼에 포커스가 있을 때 브라우저 메뉴 설치 완료로 포커스를 옮긴다", async () => {
    const user = userEvent.setup();
    render(<InstallPage />);
    await user.click(screen.getByRole("button", { name: "PC에 설치하기" }));

    act(() => window.dispatchEvent(new Event("appinstalled")));

    expect(document.activeElement).toBe(screen.getByRole("status"));
  });
});
