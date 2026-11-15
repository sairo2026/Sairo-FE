// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScheduleTag } from "./badge";
import { ScrollArea, WindowScrollHint } from "./scroll-more-hint";

afterEach(cleanup);

function setMetrics(element: HTMLElement, metrics: { scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: metrics.scrollHeight,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: metrics.clientHeight,
  });
}

describe("아래에 더 있음 표시", () => {
  it("안쪽 스크롤 영역은 장식용 표시를 숨김 처리하고 키보드로 스크롤할 수 있게 알린다", () => {
    render(
      <ScrollArea label="매물 목록" className="max-h-[224px]">
        <ul>
          <li>가</li>
        </ul>
      </ScrollArea>,
    );
    const area = screen.getByRole("group", { name: "매물 목록" });
    expect(area.className).toContain("scroll-area");
    expect(area.tabIndex).toBe(0);
    const hint = screen.getByTestId("more-below-hint");
    expect(hint.getAttribute("aria-hidden")).toBe("true");
    expect(hint.className).toContain("pointer-events-none");
    expect(hint.getAttribute("data-visible")).toBe("false");
  });

  it("안쪽 영역의 내용이 더 있으면 보이고 맨 아래에 닿으면 사라진다", () => {
    render(
      <ScrollArea label="목록">
        <ul>
          <li>가</li>
        </ul>
      </ScrollArea>,
    );
    const area = screen.getByRole("group", { name: "목록" });
    setMetrics(area, { scrollHeight: 500, clientHeight: 200 });
    act(() => {
      area.scrollTop = 0;
      area.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByTestId("more-below-hint").getAttribute("data-visible")).toBe("true");
    act(() => {
      area.scrollTop = 300;
      area.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByTestId("more-below-hint").getAttribute("data-visible")).toBe("false");
  });

  it("문서 표시는 화면 아래 내용이 남아 있을 때만 켜진다", () => {
    render(<WindowScrollHint />);
    const root = document.documentElement;
    setMetrics(root, { scrollHeight: 2000, clientHeight: 800 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    act(() => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByTestId("more-below-hint").getAttribute("data-visible")).toBe("true");
    act(() => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 1200 });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByTestId("more-below-hint").getAttribute("data-visible")).toBe("false");
  });
});

describe("색 타일의 클릭 가능 표시", () => {
  it("링크 안에 놓을 때만 호버 클래스를 갖는다", () => {
    render(
      <>
        <ScheduleTag tone="blue" label="조율 가능" count={1} isInteractive />
        <ScheduleTag tone="green" label="확정 완료" count={2} />
      </>,
    );
    expect(screen.getByText("조율 가능").parentElement?.className).toContain("clickable-tile");
    expect(screen.getByText("확정 완료").parentElement?.className).not.toContain("clickable-tile");
  });
});
