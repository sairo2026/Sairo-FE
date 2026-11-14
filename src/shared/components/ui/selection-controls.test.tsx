// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Chip } from "./chip";
import { SelectableCard } from "./selectable-card";
import { Checkbox, Radio, RadioGroup, Toggle } from "./select-field";

afterEach(cleanup);

function markOf(input: HTMLElement): HTMLElement {
  return input.nextElementSibling as HTMLElement;
}

describe("체크박스 상태", () => {
  it("선택 전에는 대비가 충분한 테두리와 호버 표시를 갖고 체크 표시가 없다", () => {
    render(<Checkbox label="중복 제외 포함" checked={false} onCheckedChange={() => {}} />);
    const input = screen.getByRole("checkbox", { name: "중복 제외 포함" });
    const mark = markOf(input);
    expect(mark.className).toContain("border-control");
    expect(mark.className).toContain("bg-white");
    expect(mark.className).toContain("group-hover:border-primary");
    expect(mark.className).toContain("group-hover:bg-primary-soft");
    expect(mark.querySelector("svg")).toBeNull();
    expect(input.closest("label")?.className).toContain("cursor-pointer");
  });

  it("선택하면 브랜드 색으로 채우고 흰 체크 표시를 보인다", () => {
    render(<Checkbox label="동의" checked onCheckedChange={() => {}} />);
    const mark = markOf(screen.getByRole("checkbox", { name: "동의" }));
    expect(mark.className).toContain("bg-primary");
    expect(mark.className).toContain("border-primary");
    expect(mark.className).toContain("text-white");
    expect(mark.querySelector("svg path")).not.toBeNull();
  });

  it("키보드 포커스 링 클래스를 갖는다", () => {
    render(<Checkbox label="동의" checked={false} onCheckedChange={() => {}} />);
    const mark = markOf(screen.getByRole("checkbox"));
    expect(mark.className).toContain("peer-focus-visible:outline-primary");
  });

  it("비활성이면 입력을 막고 호버 표시와 포인터 커서를 없앤다", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="잠금" checked={false} disabled onCheckedChange={onCheckedChange} />);
    const input = screen.getByRole("checkbox", { name: "잠금" });
    expect((input as HTMLInputElement).disabled).toBe(true);
    expect(markOf(input).className).not.toContain("group-hover");
    expect(input.closest("label")?.className).toContain("cursor-not-allowed");
    await userEvent.click(screen.getByText("잠금"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("오류 상태는 aria-invalid와 위험 색 테두리로 알린다", () => {
    render(<Checkbox label="필수" checked={false} isInvalid onCheckedChange={() => {}} />);
    const input = screen.getByRole("checkbox", { name: "필수" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(markOf(input).className).toContain("border-danger");
  });

  it("라벨 글자를 눌러도 선택이 바뀌고 터치 영역은 44px 이상이다", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="약관 동의" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByText("약관 동의"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("약관 동의").closest("label")?.className).toContain("min-h-11");
  });

  it("보이는 라벨이 없으면 ariaLabel로 이름을 붙인다", () => {
    render(<Checkbox ariaLabel="김고객 선택" checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "김고객 선택" })).toBeTruthy();
  });
});

describe("라디오 상태", () => {
  it("선택 전과 선택 상태가 테두리 모양으로 구분된다", () => {
    const { rerender } = render(
      <Radio name="r" label="월세" checked={false} onSelect={() => {}} />,
    );
    const off = markOf(screen.getByRole("radio", { name: "월세" }));
    expect(off.className).toContain("border-control");
    expect(off.className).toContain("group-hover:bg-primary-soft");
    rerender(<Radio name="r" label="월세" checked onSelect={() => {}} />);
    const on = markOf(screen.getByRole("radio", { name: "월세" }));
    expect(on.className).toContain("border-[5px]");
    expect(on.className).toContain("border-primary");
  });

  it("비활성과 오류 상태를 표시한다", () => {
    const { rerender } = render(
      <Radio name="r" label="전세" checked={false} disabled onSelect={() => {}} />,
    );
    const disabled = screen.getByRole("radio", { name: "전세" });
    expect((disabled as HTMLInputElement).disabled).toBe(true);
    expect(markOf(disabled).className).not.toContain("group-hover");
    rerender(<Radio name="r" label="전세" checked={false} isInvalid onSelect={() => {}} />);
    const invalid = screen.getByRole("radio", { name: "전세" });
    expect(markOf(invalid).className).toContain("border-danger");
  });

  it("라디오 묶음은 오류 문구가 있으면 묶음과 모든 선택지에 오류 상태를 준다", () => {
    render(
      <RadioGroup
        legend="거래유형"
        name="trade"
        value=""
        options={[
          { value: "a", label: "월세" },
          { value: "b", label: "전세" },
        ]}
        onValueChange={() => {}}
        error="선택해 주세요."
      />,
    );
    expect(screen.getByRole("group", { name: "거래유형" }).getAttribute("aria-invalid")).toBe(
      "true",
    );
    for (const radio of screen.getAllByRole("radio")) {
      expect(markOf(radio).className).toContain("border-danger");
    }
  });
});

describe("토글 상태", () => {
  it("꺼짐은 회색 바탕과 왼쪽 손잡이, 켜짐은 브랜드 색과 오른쪽 손잡이다", () => {
    const { rerender } = render(<Toggle label="알림" checked={false} onCheckedChange={() => {}} />);
    const off = screen.getByRole("switch", { name: "알림" });
    expect(off.getAttribute("aria-checked")).toBe("false");
    expect(off.className).toContain("bg-control");
    expect(off.firstElementChild?.className).toContain("translate-x-1");
    rerender(<Toggle label="알림" checked onCheckedChange={() => {}} />);
    const on = screen.getByRole("switch", { name: "알림" });
    expect(on.getAttribute("aria-checked")).toBe("true");
    expect(on.className).toContain("bg-primary");
    expect(on.firstElementChild?.className).toContain("translate-x-[34px]");
  });

  it("비활성은 클릭을 막고 오류는 aria-invalid로 알린다", async () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Toggle label="알림" checked={false} disabled onCheckedChange={onCheckedChange} />,
    );
    await userEvent.click(screen.getByRole("switch", { name: "알림" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
    rerender(<Toggle label="알림" checked={false} isInvalid onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole("switch").getAttribute("aria-invalid")).toBe("true");
  });
});

describe("선택형 칩과 카드 상태", () => {
  it("칩은 선택 전 테두리와 호버, 선택 시 채움과 흰 글자를 갖는다", () => {
    const { rerender } = render(<Chip isSelected={false}>월세</Chip>);
    const off = screen.getByRole("button", { name: "월세" });
    expect(off.className).toContain("border-control");
    expect(off.className).toContain("enabled:hover:bg-primary-soft");
    expect(off.className).toContain("min-h-11");
    rerender(<Chip isSelected>월세</Chip>);
    const on = screen.getByRole("button", { name: "월세" });
    expect(on.getAttribute("aria-pressed")).toBe("true");
    expect(on.className).toContain("bg-primary");
    expect(on.className).toContain("text-white");
  });

  it("칩의 비활성과 오류 상태를 표시한다", () => {
    const { rerender } = render(
      <Chip isSelected={false} disabled>
        전세
      </Chip>,
    );
    expect((screen.getByRole("button", { name: "전세" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(
      <Chip isSelected={false} isInvalid>
        전세
      </Chip>,
    );
    expect(screen.getByRole("button", { name: "전세" }).className).toContain("border-danger");
  });

  it("선택 카드는 radio 역할이면 aria-checked, 아니면 aria-pressed를 쓴다", () => {
    const { rerender } = render(
      <SelectableCard selectionRole="radio" isSelected>
        사무소 만들기
      </SelectableCard>,
    );
    const radio = screen.getByRole("radio", { name: "사무소 만들기" });
    expect(radio.getAttribute("aria-checked")).toBe("true");
    expect(radio.className).toContain("border-primary");
    expect(radio.className).toContain("bg-primary-soft");
    rerender(<SelectableCard isSelected={false}>전체</SelectableCard>);
    const button = screen.getByRole("button", { name: "전체" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.className).toContain("border-control");
    expect(button.className).toContain("enabled:hover:border-primary");
  });
});
