// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ApproverLayout, CustomerSiteLayout, OfficeLayout, OpsLayout } from "./layouts";

afterEach(cleanup);

describe("레이아웃", () => {
  it("사무소 레이아웃은 메뉴 6개를 보여주고 현재 위치를 알린다", () => {
    render(
      <OfficeLayout activeKey="properties" officeName="사이로중개사무소">
        <p>본문</p>
      </OfficeLayout>,
    );
    const nav = screen.getByRole("navigation", { name: "주요 메뉴" });
    expect(nav.querySelectorAll("a").length).toBe(6);
    expect(screen.getByRole("link", { name: "매물 관리" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      screen.getByRole("link", { name: "홈 (오늘 할 일)" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("고객용 사이트는 사무소 메뉴 없이 본문과 하단 영역을 둔다", () => {
    render(
      <CustomerSiteLayout footer={<p>사업자 정보</p>}>
        <p>본문</p>
      </CustomerSiteLayout>,
    );
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("main").textContent).toBe("본문");
    expect(screen.getByRole("contentinfo").textContent).toBe("사업자 정보");
  });

  it("승인자 화면은 메뉴가 없다", () => {
    render(
      <ApproverLayout>
        <p>조건 등록</p>
      </ApproverLayout>,
    );
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("main").textContent).toContain("조건 등록");
  });

  it("사측 콘솔은 사무소 메뉴와 분리된 운영 메뉴를 쓴다", () => {
    render(
      <OpsLayout activeKey="home" navItems={[{ key: "home", label: "운영 홈", href: "/ops" }]}>
        <p>운영 본문</p>
      </OpsLayout>,
    );
    expect(screen.getByRole("navigation", { name: "운영 메뉴" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "주요 메뉴" })).toBeNull();
    expect(screen.getByText("운영 콘솔")).toBeTruthy();
    expect(screen.getByAltText("사이로")).toBeTruthy();
  });
});
