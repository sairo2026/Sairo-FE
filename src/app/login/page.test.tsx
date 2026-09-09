// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LoginPage from "./page";

afterEach(cleanup);

describe("LoginPage", () => {
  it("브랜드 로고가 준비되기 전에는 회색 placeholder만 표시한다", async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({}) });
    const { container } = render(page);

    expect(container.querySelector(".h-16.w-16.rounded-2xl.bg-neutral-200")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("link", { name: "카카오로 시작하기" })).not.toBeNull();
  });
});
