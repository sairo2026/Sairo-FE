// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuthFrame } from "@/shared/components/feedback/form-frame";
import { Card } from "@/shared/components/ui/card";
import { KAKAO_LINK_NOTICE, KAKAO_LINK_SUMMARY } from "../model/legal-copy";
import { AuthEntry } from "./auth-entry";

afterEach(cleanup);

describe("로그인 처음 화면 규격", () => {
  it("카드는 폭 460에 테두리 없이 그림자만 쓰고 버튼은 공통 크기를 따른다", () => {
    render(<AuthEntry mode="login" />);
    const kakao = screen.getByRole("link", { name: "카카오로 시작하기" });
    const email = screen.getByRole("link", { name: "이메일로 로그인하기" });
    for (const link of [kakao, email]) {
      expect(link.className).toContain("rounded-control");
      expect(link.className).toContain("text-body");
      expect(link.className).toContain("active:");
    }
    const card = kakao.closest("section");
    expect(card?.className).toContain("max-w-[460px]");
    expect(card?.className).toContain("shadow-auth");
    expect(card?.className).not.toContain("border-line");
  });

  it("카카오 버튼은 노랑이고 이메일 버튼은 연한 브랜드 채움이며 높이는 48이다", () => {
    render(<AuthEntry mode="login" />);
    const kakao = screen.getByRole("link", { name: "카카오로 시작하기" });
    const email = screen.getByRole("link", { name: "이메일로 로그인하기" });
    expect(kakao.className).toContain("bg-[#ffee52]");
    expect(email.className).toContain("bg-primary-soft");
    expect(email.className).toContain("text-ink");
    expect(email.className).not.toContain("text-primary");
    expect(kakao.className).toContain("h-12");
    expect(email.className).toContain("h-12");
  });
});

describe("로그인 처음 화면 안내", () => {
  it("탈퇴를 마친 사람에게 완료 안내를 보여준다", () => {
    render(<AuthEntry mode="login" noticeCode="withdrawn" />);
    expect(screen.getByRole("status").textContent).toContain("회원 탈퇴가 완료되었습니다");
  });

  it("알 수 없는 안내 코드는 아무것도 보이지 않는다", () => {
    render(<AuthEntry mode="login" noticeCode="unknown" />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("회원가입 카카오 연결 안내", () => {
  it("짧은 안내를 먼저 보여주고 기존 상세 문구는 키보드로 펼칠 수 있다", () => {
    render(<AuthEntry mode="signup" />);
    expect(screen.getByText(KAKAO_LINK_SUMMARY)).not.toBeNull();
    const summary = screen.getByText("카카오 계정 연결·해제 안내 자세히 보기");
    const details = summary.closest("details");
    expect(details?.open).toBe(false);
    expect(details?.textContent?.replace(/\s+/g, " ")).toContain(KAKAO_LINK_NOTICE);
    summary.click();
    expect(details?.open).toBe(true);
    expect(summary.closest("details")?.querySelector("summary")).toBe(summary);
  });
});

describe("로그인 처음 화면 구조", () => {
  it("본문 영역과 화면 제목을 스크린리더에 알린다", () => {
    const { unmount } = render(<AuthEntry mode="login" />);
    expect(screen.getByRole("main")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "로그인" })).not.toBeNull();
    unmount();
    render(<AuthEntry mode="signup" />);
    expect(screen.getByRole("main")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "회원가입" })).not.toBeNull();
  });
});

describe("가입 카드 규격", () => {
  it("가입 정보 카드는 폭 676과 그림자를 쓰고 제목과 폼 사이가 넓다", () => {
    render(
      <AuthFrame title="가입 정보">
        <p>본문</p>
      </AuthFrame>,
    );
    const card = screen.getByRole("heading", { name: "가입 정보" }).closest("section");
    expect(card?.className).toContain("max-w-[676px]");
    expect(card?.className).toContain("shadow-auth");
    expect(card?.className).toContain("sm:px-10");
    expect(card?.className).toContain("sm:py-12");
    expect(screen.getByText("본문").parentElement?.className).toContain("sm:mt-12");
  });

  it("form 카드는 로고 없이 제목만 두고 가입 카드 그림자를 쓴다", () => {
    render(
      <AuthFrame title="가입 정보" variant="form">
        <p>본문</p>
      </AuthFrame>,
    );
    const card = screen.getByRole("heading", { name: "가입 정보" }).closest("section");
    expect(card?.querySelector("img")).toBeNull();
    expect(card?.className).toContain("shadow-modal");
    expect(card?.className).not.toContain("shadow-auth");
  });

  it("일반 설명과 입력 영역은 48px, 비밀번호 찾기는 화면별 기준 56px을 쓴다", () => {
    const { rerender } = render(
      <AuthFrame title="안내" description="설명" variant="form">
        <p>입력 영역</p>
      </AuthFrame>,
    );
    expect(screen.getByText("입력 영역").parentElement?.className).toContain("mt-12");
    rerender(
      <AuthFrame title="안내" description="설명" variant="form" contentGap="passwordRecovery">
        <p>입력 영역</p>
      </AuthFrame>,
    );
    expect(screen.getByText("입력 영역").parentElement?.className).toContain("mt-14");
  });

  it("login 카드는 로고와 한 줄 소개를 두고 폭 624를 쓴다", () => {
    render(
      <AuthFrame title="로그인" variant="login" tagline="소개 문구입니다.">
        <p>본문</p>
      </AuthFrame>,
    );
    const card = screen.getByRole("heading", { name: "로그인" }).closest("section");
    expect(card?.querySelector("img")).not.toBeNull();
    expect(card?.className).toContain("max-w-[624px]");
    expect(screen.getByText("소개 문구입니다.").className).toContain("text-ink-2");
  });

  it("기본 카드와 납작한 카드는 테두리를 유지한다", () => {
    render(
      <>
        <Card title="기본">내용</Card>
        <Card title="납작" tone="flat">
          내용
        </Card>
      </>,
    );
    expect(screen.getByRole("heading", { name: "기본" }).closest("section")?.className).toContain(
      "border-line",
    );
    expect(screen.getByRole("heading", { name: "납작" }).closest("section")?.className).toContain(
      "rounded-card-flat",
    );
  });
});
