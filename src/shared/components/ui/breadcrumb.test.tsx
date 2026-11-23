// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";

describe("위치 경로", () => {
  afterEach(cleanup);

  it("마지막 항목은 현재 화면으로 표시하고 앞 항목은 링크로 연다", () => {
    render(
      <PageHeader
        title="계약 상세"
        breadcrumb={[
          { label: "계약 관리", href: "/contracts" },
          { label: "계약 상세", href: "/contracts/1" },
          { label: "중개보수" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "현재 위치" });
    expect(nav.querySelectorAll("a")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "계약 관리" }).getAttribute("href")).toBe("/contracts");
    expect(screen.getByText("중개보수").getAttribute("aria-current")).toBe("page");
  });

  it("경로가 없으면 위치 안내를 그리지 않는다", () => {
    render(<PageHeader title="매물 관리" />);
    expect(screen.queryByRole("navigation", { name: "현재 위치" })).toBeNull();
  });
});
