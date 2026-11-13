// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OfficeAccessProvider } from "@/shared/session/office-access-context";
import type { OfficeAccess } from "@/shared/session/office-access-context";
import { ErrorAudienceProvider } from "./error-audience";
import { ErrorScreen } from "./error-screen";

afterEach(() => cleanup());

function officeAccess(role: OfficeAccess["role"]): OfficeAccess {
  return {
    context: {
      accessCondition: "ACTIVE",
      officeId: 12,
      role,
      pendingRegistrationId: null,
      pendingMembershipId: null,
    } as OfficeAccess["context"],
    role,
    isReadOnly: false,
  };
}

describe("오류 화면의 대상별 안내", () => {
  it("운영 콘솔의 권한 없음은 보안관리자 안내와 운영 홈 링크를 준다", () => {
    render(
      <ErrorAudienceProvider audience="ops">
        <ErrorScreen kind="forbidden" />
      </ErrorAudienceProvider>,
    );
    expect(screen.getByText(/역할 변경은 보안관리자에게 요청해 주세요/)).toBeTruthy();
    expect(screen.queryByText(/사무소 대표에게/)).toBeNull();
    expect(screen.getByRole("link", { name: "운영 홈으로" }).getAttribute("href")).toBe("/ops");
  });

  it("운영 콘솔의 미로그인은 운영자 로그인으로 보낸다", () => {
    render(
      <ErrorAudienceProvider audience="ops">
        <ErrorScreen kind="unauthenticated" />
      </ErrorAudienceProvider>,
    );
    expect(screen.getByRole("link", { name: "운영자 로그인" }).getAttribute("href")).toBe(
      "/ops/login",
    );
  });

  it("링크로 들어온 비회원에게는 로그인과 홈 링크를 주지 않는다", () => {
    const { unmount } = render(
      <ErrorAudienceProvider audience="guest">
        <ErrorScreen kind="forbidden" />
      </ErrorAudienceProvider>,
    );
    expect(screen.getByText(/링크를 보낸 중개사무소에 문의해 주세요/)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    unmount();
    render(
      <ErrorAudienceProvider audience="guest">
        <ErrorScreen kind="unauthenticated" />
      </ErrorAudienceProvider>,
    );
    expect(screen.getByRole("heading", { name: "다시 확인이 필요합니다" })).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("사무소 대표에게는 대표에게 문의하라는 문구 대신 상태 확인을 안내한다", () => {
    render(
      <OfficeAccessProvider value={officeAccess("OWNER")}>
        <ErrorScreen kind="forbidden" />
      </OfficeAccessProvider>,
    );
    expect(screen.getByText(/사무소 인증 상태와 구독 상태를 확인해 주세요/)).toBeTruthy();
    expect(screen.queryByText(/사무소 대표에게/)).toBeNull();
  });

  it("대표가 아닌 구성원에게는 대표에게 문의하라고 안내한다", () => {
    render(
      <OfficeAccessProvider value={officeAccess("AGENT")}>
        <ErrorScreen kind="forbidden" />
      </OfficeAccessProvider>,
    );
    expect(screen.getByText(/사무소 대표에게 권한을 문의해 주세요/)).toBeTruthy();
  });

  it("화면에서 직접 준 문구는 대상과 관계없이 그대로 쓴다", () => {
    render(
      <ErrorAudienceProvider audience="ops">
        <ErrorScreen kind="forbidden" description="대표만 볼 수 있습니다." />
      </ErrorAudienceProvider>,
    );
    expect(screen.getByText("대표만 볼 수 있습니다.")).toBeTruthy();
  });
});
