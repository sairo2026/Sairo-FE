// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OfficeLayout, OpsLayout } from "@/shared/layouts/layouts";
import { Badge, DDayTag, ScheduleTag, TradeTypeTag } from "./badge";
import { Chip } from "./chip";
import { DateTimeField } from "./date-time-field";
import { Modal } from "./modal";
import { SelectField } from "./select-field";
import { SideNavItem } from "./side-nav-item";
import { TextAreaField } from "./textarea-field";
import { TextField } from "./text-field";

afterEach(cleanup);

describe("폼 라벨 규격", () => {
  it("라벨은 16 SemiBold이고 필수 별표는 Red2 색이며 스크린리더가 읽지 않는다", () => {
    render(<TextField label="이름" value="" onValueChange={() => {}} required />);
    const label = screen.getByText("이름").closest("label");
    expect(label?.className).toContain("text-body");
    expect(label?.className).toContain("font-semibold");
    const star = label?.querySelector("span");
    expect(star?.className).toContain("text-required");
    expect(star?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByLabelText(/이름/).hasAttribute("required")).toBe(true);
  });

  it("라벨과 입력창 간격은 12px이고 모든 입력 컨트롤이 같은 규격을 쓴다", () => {
    const { container } = render(
      <>
        <TextField label="a" value="" onValueChange={() => {}} />
        <SelectField label="b" value="" options={[]} onValueChange={() => {}} required />
        <TextAreaField label="c" value="" onValueChange={() => {}} required />
        <DateTimeField label="d" kind="date" value="" onValueChange={() => {}} required />
      </>,
    );
    for (const label of container.querySelectorAll("label")) {
      expect(label.className).toContain("text-body");
      expect(label.parentElement?.className).toContain("gap-3");
    }
    expect(container.querySelectorAll(".text-required").length).toBe(3);
  });
});

describe("선택 버튼과 태그 규격", () => {
  it("선택 버튼(lg)은 높이 58과 16 글자이고 필터 칩(sm)은 기존 크기를 유지한다", () => {
    render(
      <>
        <Chip size="lg" isSelected={false}>
          월세
        </Chip>
        <Chip isSelected={false}>전체</Chip>
      </>,
    );
    expect(screen.getByRole("button", { name: "월세" }).className).toContain("min-h-[58px]");
    expect(screen.getByRole("button", { name: "전체" }).className).toContain("min-h-11");
  });

  it("거래유형 태그는 16 Medium, D-Day 태그는 90일 이내만 SemiBold이다", () => {
    render(
      <>
        <TradeTypeTag type="jeonse" />
        <DDayTag daysLeft={30} />
        <DDayTag daysLeft={200} />
        <DDayTag daysLeft={null} />
      </>,
    );
    expect(screen.getByText("전세").className).toContain("text-body");
    expect(screen.getByText("D-30").className).toContain("font-semibold");
    expect(screen.getByText("D-200").className).toContain("text-ink-2");
    expect(screen.getByText("없음").className).toContain("text-ink-3");
  });

  it("조율 현황 칸은 상태 이름과 건수를 한 덩어리로 보여준다", () => {
    render(<ScheduleTag tone="blue" label="확정 완료" count={3} />);
    const tag = screen.getByText("확정 완료").parentElement;
    expect(tag?.textContent).toBe("확정 완료3건");
    expect(tag?.className).toContain("min-h-[92px]");
    expect(tag?.className).toContain("min-w-[132px]");
  });

  it("상태 태그 색 토큰은 디자인 값의 글자색을 쓴다", () => {
    render(
      <>
        <Badge tone="amber">전달</Badge>
        <Badge tone="teal">확정</Badge>
      </>,
    );
    expect(screen.getByText("전달").className).toContain("text-tag-amber-ink");
    expect(screen.getByText("확정").className).toContain("text-tag-teal-ink");
  });
});

describe("모달과 사이드 메뉴 규격", () => {
  it("모달은 폭 640, 제목 28 Bold, 요소 간격 32, 전용 그림자를 쓴다", () => {
    render(
      <Modal isOpen title="알림" onClose={() => {}}>
        <p>본문</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-w-[640px]");
    expect(dialog.className).toContain("shadow-modal");
    expect(dialog.className).toContain("sm:px-10");
    expect(dialog.className).toContain("sm:py-12");
    const title = screen.getByRole("heading", { name: "알림" });
    expect(title.className).toContain("text-h1");
    expect(title.className).toContain("font-bold");
    expect(screen.getByText("본문").parentElement?.className).toContain("mt-8");
  });

  it("사이드 메뉴 글자는 H3이고 좁은 메뉴는 md를 쓴다", () => {
    render(
      <>
        <SideNavItem href="/a" label="가" />
        <SideNavItem href="/b" label="나" size="md" />
      </>,
    );
    expect(screen.getByRole("link", { name: "가" }).className).toContain("text-h3");
    expect(screen.getByRole("link", { name: "나" }).className).toContain("text-h2");
  });

  it("사무소 레이아웃은 사이드바 폭 220을 쓰고 홈은 board 바탕을 쓴다", () => {
    const { container, rerender } = render(
      <OfficeLayout activeKey="home">
        <p>본문</p>
      </OfficeLayout>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("lg:grid-cols-[220px_minmax(0,1fr)]");
    expect(root.className).toContain("bg-white");
    rerender(
      <OfficeLayout activeKey="home" tone="board">
        <p>본문</p>
      </OfficeLayout>,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain("bg-surface");
  });

  it("운영 콘솔 메뉴는 기존 크기를 유지한다", () => {
    render(
      <OpsLayout activeKey="home" navItems={[{ key: "home", label: "운영 홈", href: "/ops" }]}>
        <p>운영 본문</p>
      </OpsLayout>,
    );
    expect(screen.getByRole("link", { name: "운영 홈" }).className).toContain("text-h2");
  });
});
