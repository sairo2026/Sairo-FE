// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TableScroll } from "./table-scroll";

class ImmediateObserver {
  constructor(private readonly callback: () => void) {}
  observe() {
    this.callback();
  }
  disconnect() {}
  unobserve() {}
}

function setSize(size: { sw: number; cw: number; sh: number; ch: number }) {
  vi.spyOn(Element.prototype, "scrollWidth", "get").mockReturnValue(size.sw);
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(size.cw);
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(size.sh);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(size.ch);
}

describe("TableScroll", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("넘치지 않으면 포커스를 받지 않는다", () => {
    vi.stubGlobal("ResizeObserver", ImmediateObserver);
    setSize({ sw: 100, cw: 100, sh: 100, ch: 100 });
    const { container } = render(<TableScroll label="목록">내용</TableScroll>);
    expect(container.querySelector(".scroll-area")?.getAttribute("tabindex")).toBeNull();
  });

  it("가로로 넘치면 가로 스크롤 안내와 함께 포커스를 받는다", () => {
    vi.stubGlobal("ResizeObserver", ImmediateObserver);
    setSize({ sw: 300, cw: 100, sh: 100, ch: 100 });
    render(<TableScroll label="목록">내용</TableScroll>);
    const region = screen.getByRole("group", { name: "목록 가로 스크롤" });
    expect(region.getAttribute("tabindex")).toBe("0");
  });

  it("세로로만 넘쳐도 키보드로 스크롤할 수 있게 포커스를 받는다", () => {
    vi.stubGlobal("ResizeObserver", ImmediateObserver);
    setSize({ sw: 100, cw: 100, sh: 500, ch: 200 });
    render(<TableScroll label="목록">내용</TableScroll>);
    const region = screen.getByRole("group", { name: "목록 스크롤" });
    expect(region.getAttribute("tabindex")).toBe("0");
  });
});
