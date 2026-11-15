// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Checkbox } from "@/shared/components/ui/select-field";
import { FieldLabel } from "@/shared/components/ui/field-label";
import { areRequiredTermsAgreed, TermsAgreementSection } from "./terms-agreement-section";
import type { TermsCatalogItem, TermsSelection } from "./terms-agreement-section";

const ITEMS: TermsCatalogItem[] = [
  {
    termsCode: "TOS",
    version: "1.0",
    required: true,
    title: "사이로 이용약관",
    documentUrl: "/legal/terms",
    category: "TERMS",
    reconsentRequired: false,
    changeSummary: null,
  },
  {
    termsCode: "PRIVACY",
    version: "1.0",
    required: false,
    title: "사이로 개인정보처리방침",
    documentUrl: "/legal/privacy",
    category: "NOTICE",
    reconsentRequired: false,
    changeSummary: null,
  },
  {
    termsCode: "MARKETING",
    version: "1.0",
    required: false,
    title: "이메일 공지·혜택 안내 수신 동의(선택)",
    documentUrl: "/legal/marketing",
    category: "MARKETING",
    reconsentRequired: false,
    changeSummary: null,
  },
];

function Harness() {
  const [selection, setSelection] = useState<TermsSelection>({});
  return (
    <>
      <TermsAgreementSection items={ITEMS} selection={selection} onChange={setSelection} />
      <output data-testid="ready">{String(areRequiredTermsAgreed(ITEMS, selection))}</output>
    </>
  );
}

afterEach(cleanup);

describe("약관 동의 영역의 필수·선택 표시", () => {
  it("필수 약관은 필수, 마케팅은 선택으로 표시하고 둘 다 처음에는 체크되어 있지 않다", () => {
    render(<Harness />);
    const tos = screen.getByRole("checkbox", { name: /이용약관에 동의합니다/ });
    const marketing = screen.getByRole("checkbox", { name: /공지·혜택 안내를 받고/ });
    expect((tos as HTMLInputElement).checked).toBe(false);
    expect((marketing as HTMLInputElement).checked).toBe(false);
    expect(tos.closest("label")?.textContent).toContain("(필수)");
    expect(marketing.closest("label")?.textContent).toContain("(선택)");
  });

  it("개인정보처리방침은 체크 없는 열람 고지이고 전문 보기만 둔다", () => {
    render(<Harness />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /개인정보처리방침 전문 보기/ })).toBeTruthy();
  });

  it("필수 약관에 체크해야 진행할 수 있고 선택 항목은 진행 조건이 아니다", async () => {
    render(<Harness />);
    expect(screen.getByTestId("ready").textContent).toBe("false");
    await userEvent.click(screen.getByRole("checkbox", { name: /공지·혜택 안내를 받고/ }));
    expect(screen.getByTestId("ready").textContent).toBe("false");
    await userEvent.click(screen.getByRole("checkbox", { name: /이용약관에 동의합니다/ }));
    expect(screen.getByTestId("ready").textContent).toBe("true");
  });

  it("선택 항목만 체크를 풀어도 필수 동의는 유지된다", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("checkbox", { name: /이용약관에 동의합니다/ }));
    expect(screen.getByTestId("ready").textContent).toBe("true");
    await userEvent.click(screen.getByRole("checkbox", { name: /공지·혜택 안내를 받고/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /공지·혜택 안내를 받고/ }));
    expect(screen.getByTestId("ready").textContent).toBe("true");
  });
});

describe("체크박스와 입력 라벨의 필수·선택 표시", () => {
  it("requirement를 주면 필수는 별표와 (필수), 선택은 (선택)을 붙인다", () => {
    render(
      <>
        <Checkbox
          label="확인했습니다"
          requirement="required"
          checked={false}
          onCheckedChange={() => {}}
        />
        <Checkbox
          label="받겠습니다"
          requirement="optional"
          checked={false}
          onCheckedChange={() => {}}
        />
      </>,
    );
    const required = screen.getByText("(필수)");
    expect(required.textContent).toBe("*(필수)");
    expect(required.querySelector("[aria-hidden='true']")?.textContent).toBe("*");
    expect(screen.getByText("(선택)")).toBeTruthy();
  });

  it("requirement가 없으면 라벨 모양이 바뀌지 않는다", () => {
    render(<Checkbox label="그대로" checked={false} onCheckedChange={() => {}} />);
    expect(screen.queryByText("(필수)")).toBeNull();
    expect(screen.queryByText("(선택)")).toBeNull();
  });

  it("입력 라벨 끝의 (선택)은 옅은 글씨로 나누되 글자와 띄어쓰기는 그대로 둔다", () => {
    render(
      <>
        <FieldLabel htmlFor="a">메모(선택)</FieldLabel>
        <FieldLabel htmlFor="b">요청 내용 (선택)</FieldLabel>
        <FieldLabel htmlFor="c" required>
          이름
        </FieldLabel>
      </>,
    );
    const labels = Array.from(document.querySelectorAll("label")).map((node) => node.textContent);
    expect(labels).toEqual(["메모(선택)", "요청 내용 (선택)", "이름*"]);
    expect(document.querySelectorAll("label span.text-ink-2")).toHaveLength(2);
  });
});
