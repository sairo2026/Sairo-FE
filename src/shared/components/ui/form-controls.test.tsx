// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { DateTimeField } from "./date-time-field";
import { Chip, TimeSlotChip } from "./chip";
import { Checkbox, RadioGroup, SelectField, TermsItem, Toggle } from "./select-field";
import { SearchField } from "./search-field";
import { TextField } from "./text-field";

afterEach(cleanup);

describe("Button", () => {
  it("처리 중에는 클릭을 막고 aria-busy를 알린다", async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        저장
      </Button>,
    );
    const button = screen.getByRole("button", { name: "저장" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("비활성 상태에서는 클릭되지 않는다", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        다음
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("기본 상태에서 클릭을 전달하고 키보드로 누를 수 있다", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>다음</Button>);
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "다음" }));
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

function TextFieldHarness({ kind }: { kind: "text" | "number" | "tel" | "password" }) {
  const [value, setValue] = useState("");
  return <TextField label="입력" kind={kind} value={value} onValueChange={setValue} />;
}

describe("TextField", () => {
  it("라벨과 입력이 연결되고 오류를 alert로 알린다", () => {
    render(
      <TextField label="이름" value="" onValueChange={() => {}} error="이름을 입력해 주세요." />,
    );
    const input = screen.getByLabelText("이름");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("이름을 입력해 주세요.");
    expect(input.getAttribute("aria-describedby")).toBe(screen.getByRole("alert").id);
  });

  it("전화 입력은 하이픈을 자동으로 넣는다", async () => {
    render(<TextFieldHarness kind="tel" />);
    await userEvent.type(screen.getByLabelText("입력"), "01012345678");
    expect((screen.getByLabelText("입력") as HTMLInputElement).value).toBe("010-1234-5678");
  });

  it("숫자 입력은 숫자 이외를 걸러낸다", async () => {
    render(<TextFieldHarness kind="number" />);
    await userEvent.type(screen.getByLabelText("입력"), "1a2,3");
    expect((screen.getByLabelText("입력") as HTMLInputElement).value).toBe("123");
  });

  it("비밀번호 입력은 가려서 보이고 입력값을 그대로 보존한다", async () => {
    render(<TextFieldHarness kind="password" />);
    const input = screen.getByLabelText("입력") as HTMLInputElement;
    expect(input.type).toBe("password");
    await userEvent.type(input, " ab c ");
    expect(input.value).toBe(" ab c ");
  });

  it("인증 버튼과 남은 시간을 표시한다", async () => {
    const onAction = vi.fn();
    render(
      <TextField
        label="인증번호"
        value=""
        onValueChange={() => {}}
        actionLabel="인증"
        onAction={onAction}
        timerText="5:00"
      />,
    );
    expect(screen.getByRole("timer").textContent).toBe("5:00");
    await userEvent.click(screen.getByRole("button", { name: "인증" }));
    expect(onAction).toHaveBeenCalled();
  });

  it("최대 글자 수를 표시한다", () => {
    render(<TextField label="제목" value="가나" maxLength={100} onValueChange={() => {}} />);
    expect(screen.getByText("2/100")).toBeTruthy();
  });
});

describe("선택 부품", () => {
  it("셀렉트 값을 바꾼다", async () => {
    const onValueChange = vi.fn();
    render(
      <SelectField
        label="유형"
        value=""
        placeholder="선택"
        options={[
          { value: "a", label: "월세" },
          { value: "b", label: "전세" },
        ]}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText("유형"), "b");
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("라디오는 한 번에 하나만 선택하고 방향키로 이동한다", async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        legend="거래유형"
        name="trade"
        value="a"
        options={[
          { value: "a", label: "월세" },
          { value: "b", label: "전세" },
        ]}
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("group", { name: "거래유형" })).toBeTruthy();
    await userEvent.click(screen.getByLabelText("전세"));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("체크박스는 키보드 스페이스로 토글된다", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="동의" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.tab();
    await userEvent.keyboard(" ");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("토글은 switch 역할과 aria-checked를 갖는다", async () => {
    const onCheckedChange = vi.fn();
    render(<Toggle label="알림" checked={false} onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole("switch", { name: "알림" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    await userEvent.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("약관 항목은 필수 표시와 전문 보기 링크를 한 행에 둔다", () => {
    render(
      <TermsItem
        label="서비스 이용 약관 동의"
        isRequired
        checked={false}
        onCheckedChange={() => {}}
        href="/terms"
      />,
    );
    expect(screen.getByText("(필수)")).toBeTruthy();
    expect(screen.getByRole("link", { name: "전문 보기" }).getAttribute("href")).toBe("/terms");
  });
});

describe("날짜·시간·칩·검색", () => {
  it("날짜와 시각 입력은 값을 바꾼다", async () => {
    const onValueChange = vi.fn();
    render(<DateTimeField label="날짜" kind="date" value="" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("날짜") as HTMLInputElement;
    expect(input.type).toBe("date");
    await userEvent.type(input, "2026-11-10");
    expect(onValueChange).toHaveBeenCalled();
  });

  it("칩은 aria-pressed로 선택 상태를 알린다", async () => {
    const onClick = vi.fn();
    render(
      <Chip isSelected onClick={onClick}>
        월세
      </Chip>,
    );
    const chip = screen.getByRole("button", { name: "월세" });
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(chip);
    expect(onClick).toHaveBeenCalled();
  });

  it("시간 슬롯 칩은 서울 시각으로 표시하고 비활성 상태를 막는다", async () => {
    const onToggle = vi.fn();
    render(
      <TimeSlotChip
        startsAt="2026-08-20T01:30:00Z"
        isSelected={false}
        isDisabled
        onToggle={onToggle}
      />,
    );
    const chip = screen.getByRole("button", { name: "8월 20일 오전 10:30" });
    await userEvent.click(chip);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("검색창은 제출하면 검색을 실행한다", async () => {
    const onSearch = vi.fn();
    render(<SearchField value="" onValueChange={() => {}} onSearch={onSearch} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "검색" }), "{Enter}");
    expect(onSearch).toHaveBeenCalled();
  });
});
