// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuthFrame } from "@/shared/components/feedback/form-frame";
import { Card } from "@/shared/components/ui/card";
import { AuthEntry } from "./auth-entry";

afterEach(cleanup);

describe("로그인 처음 화면 규격", () => {
  it("카드는 폭 460에 테두리 없이 그림자만 쓰고 버튼은 모서리 12와 20 글자다", () => {
    render(<AuthEntry mode="login" />);
    const kakao = screen.getByRole("link", { name: "카카오로 시작하기" });
    const email = screen.getByRole("link", { name: "이메일로 시작하기" });
    for (const link of [kakao, email]) {
      expect(link.className).toContain("rounded-xl");
      expect(link.className).toContain("text-h2");
      expect(link.className).toContain("active:");
    }
    const card = kakao.closest("section");
    expect(card?.className).toContain("max-w-[460px]");
    expect(card?.className).toContain("shadow-auth");
    expect(card?.className).not.toContain("border-line");
  });

  it("카카오 버튼은 디자인의 노랑이고 이메일 버튼은 연한 브랜드 채움에 본문색 글자이며 높이는 68이다", () => {
    render(<AuthEntry mode="login" />);
    const kakao = screen.getByRole("link", { name: "카카오로 시작하기" });
    const email = screen.getByRole("link", { name: "이메일로 시작하기" });
    expect(kakao.className).toContain("bg-[#ffee52]");
    expect(email.className).toContain("bg-primary-soft");
    expect(email.className).toContain("text-ink");
    expect(email.className).not.toContain("text-primary");
    expect(kakao.className).toContain("h-[68px]");
    expect(email.className).toContain("h-[68px]");
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
    expect(screen.getByText("본문").parentElement?.className).toContain("sm:mt-11");
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

  it("login 카드는 로고와 한 줄 소개를 두고 폭 624를 쓴다", () => {
    render(
      <AuthFrame title="로그인" variant="login" tagline="소개 문구입니다.">
        <p>본문</p>
      </AuthFrame>,
    );
    const card = screen.getByRole("heading", { name: "로그인" }).closest("section");
    expect(card?.querySelector("img")).not.toBeNull();
    expect(card?.className).toContain("max-w-[624px]");
    expect(screen.getByText("소개 문구입니다.").className).toContain("text-primary");
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
