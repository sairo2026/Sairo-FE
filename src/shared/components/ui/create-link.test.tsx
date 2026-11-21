// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CreateLink } from "./create-link";

afterEach(cleanup);

describe("등록 링크", () => {
  it("활성 상태에서는 이동 가능한 링크다", () => {
    render(<CreateLink href="/properties/new">매물 등록</CreateLink>);

    const link = screen.getByRole("link", { name: "매물 등록" });
    expect(link.getAttribute("href")).toBe("/properties/new");
    expect(link.getAttribute("aria-disabled")).toBeNull();
  });

  it("비활성 상태에서는 이동 주소가 없어 키보드로 열리지 않는다", () => {
    render(
      <CreateLink href="/properties/new" isDisabled>
        매물 등록
      </CreateLink>,
    );

    const link = screen.getByRole("link", { name: "매물 등록" });
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("href")).toBeNull();
    expect(link.tagName).toBe("SPAN");
    expect(link.getAttribute("tabindex")).toBeNull();
  });

  it("활성과 비활성의 모양 클래스는 같고 비활성만 회색 배경을 쓴다", () => {
    const { rerender } = render(<CreateLink href="/customers/new">고객 등록</CreateLink>);
    const active = screen.getByRole("link", { name: "고객 등록" }).className;
    rerender(
      <CreateLink href="/customers/new" isDisabled>
        고객 등록
      </CreateLink>,
    );
    const disabled = screen.getByRole("link", { name: "고객 등록" }).className;

    expect(disabled).toBe(active);
    expect(disabled).toContain("aria-disabled:bg-ink-3");
  });
});
