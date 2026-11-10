// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CookieNotice } from "./cookie-notice";
import { COOKIE_NOTICE_COPY, ENTERPRISE_PRIVACY_COPY, RAW_ACCESS_PLEDGE_COPY } from "./notice-copy";

afterEach(cleanup);

describe("쿠키와 세션 안내", () => {
  it("필수 쿠키만 쓰고 추적 쿠키를 쓰지 않는다고 알리며 방침으로 연결한다", () => {
    render(<CookieNotice />);
    expect(screen.getByText(/필수 쿠키만 사용합니다/)).not.toBeNull();
    expect(screen.getByText(/분석 도구는 사용하지 않습니다/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "개인정보처리방침 보기" }).getAttribute("href")).toBe(
      "/legal/privacy",
    );
  });

  it("승인자와 운영 콘솔 화면은 보충 문구를 더한다", () => {
    const { rerender } = render(<CookieNotice variant="approver" />);
    expect(screen.getByText(new RegExp(COOKIE_NOTICE_COPY.approver.slice(0, 12)))).not.toBeNull();
    rerender(<CookieNotice variant="ops" />);
    expect(screen.getByText(/2차 인증 상태를 유지하는 필수 쿠키/)).not.toBeNull();
  });
});

describe("고정 안내 문구", () => {
  it("기업 도입 문의 안내는 항목, 목적, 보관, 거부 권리를 모두 담는다", () => {
    const text = ENTERPRISE_PRIVACY_COPY.items.join(" ");
    expect(text).toContain("받는 항목");
    expect(text).toContain("이용 목적");
    expect(text).toContain("문의가 종료된 날부터 3년");
    expect(text).toContain("거부 권리");
  });

  it("운영자 보안 서약은 세 항목이다", () => {
    expect(RAW_ACCESS_PLEDGE_COPY.items).toHaveLength(3);
  });
});
