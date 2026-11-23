// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootError from "./error";
import NotFound from "./not-found";

describe("전역 오류 화면의 주 영역", () => {
  afterEach(cleanup);

  it("라우트 오류의 제목을 단일 주 영역에 표시한다", () => {
    render(<RootError error={new Error("fixture")} reset={vi.fn()} />);

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(within(screen.getByRole("main")).getByRole("heading").textContent).toBe(
      "문제가 발생했습니다",
    );
  });

  it("없는 주소의 제목을 단일 주 영역에 표시한다", () => {
    render(<NotFound />);

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(within(screen.getByRole("main")).getByRole("heading").textContent).toBe(
      "페이지를 찾을 수 없습니다",
    );
  });
});
