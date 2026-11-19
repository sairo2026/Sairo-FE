// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReloadOnPageRestore } from "./reload-on-page-restore";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function firePageShow(persisted: boolean) {
  const event = new Event("pageshow") as PageTransitionEvent;
  Object.defineProperty(event, "persisted", { value: persisted });
  window.dispatchEvent(event);
}

describe("뒤로 가기로 되살아난 화면", () => {
  it("보관되었다가 되살아난 화면은 다시 불러온다", () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload });
    render(<ReloadOnPageRestore />);
    firePageShow(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("처음 여는 화면은 다시 불러오지 않는다", () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload });
    render(<ReloadOnPageRestore />);
    firePageShow(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
