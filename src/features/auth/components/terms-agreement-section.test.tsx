// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import { Checkbox } from "@/shared/components/ui/select-field";
import { FieldLabel } from "@/shared/components/ui/field-label";
import {
  areRequiredTermsAgreed,
  CollectionNoticeTable,
  selectedSignupAgreements,
  TermsAgreementSection,
} from "./terms-agreement-section";
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
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByRole("button", { name: /개인정보처리방침 전문 보기/ })).toBeTruthy();
  });

  it("필수 약관 전체 동의는 필수 항목만 체크하고 선택 항목은 건드리지 않는다", async () => {
    render(<Harness />);
    const all = screen.getByRole("checkbox", { name: "필수 약관 전체 동의" });
    await userEvent.click(all);
    expect(
      (screen.getByRole("checkbox", { name: /이용약관에 동의합니다/ }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByRole("checkbox", { name: /공지·혜택 안내를 받고/ }) as HTMLInputElement).checked,
    ).toBe(false);
    expect((all as HTMLInputElement).checked).toBe(true);
    expect(screen.getByTestId("ready").textContent).toBe("true");
  });

  it("필수 약관 전체 동의를 풀어도 사용자가 직접 체크한 선택 항목은 유지된다", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("checkbox", { name: /공지·혜택 안내를 받고/ }));
    const all = screen.getByRole("checkbox", { name: "필수 약관 전체 동의" });
    await userEvent.click(all);
    await userEvent.click(all);
    expect(
      (screen.getByRole("checkbox", { name: /이용약관에 동의합니다/ }) as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByRole("checkbox", { name: /공지·혜택 안내를 받고/ }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(screen.getByTestId("ready").textContent).toBe("false");
  });

  it("필수 항목을 하나씩 모두 체크하면 전체 동의도 체크 상태가 된다", async () => {
    render(<Harness />);
    const all = screen.getByRole("checkbox", { name: "필수 약관 전체 동의" });
    expect((all as HTMLInputElement).checked).toBe(false);
    await userEvent.click(screen.getByRole("checkbox", { name: /이용약관에 동의합니다/ }));
    expect((all as HTMLInputElement).checked).toBe(true);
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

  it("선택 동의가 보이지 않으면 선택 항목 안내를 표시하지 않는다", () => {
    render(
      <TermsAgreementSection
        items={ITEMS}
        selection={{}}
        onChange={() => {}}
        hasLoginEmail={false}
      />,
    );
    expect(screen.queryByText(/선택 항목에 동의하지 않아도/)).toBeNull();
  });

  it("개인정보 수집 표는 접은 상태로 시작하고 펼칠 수 있다", async () => {
    render(<CollectionNoticeTable />);
    const summary = screen.getByText("개인정보 수집·이용 안내 자세히 보기");
    const details = summary.closest("details");
    expect(details?.open).toBe(false);
    await userEvent.click(summary);
    expect(details?.open).toBe(true);
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("서버가 제시한 1.0 이용약관을 열고 같은 버전의 전문 링크를 제공한다", async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <Harness />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /이용약관 전문 보기/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("시행 버전 1.0");
    expect(dialog.textContent).not.toContain("이전 시행 버전");
    expect(dialog.querySelector('a[href="/legal/previous/terms/1.0"]')).not.toBeNull();
  });

  it("서버 버전에 맞는 로컬 원문이 없으면 해당 동의를 막는다", () => {
    const firstItem = ITEMS[0];
    if (!firstItem) throw new Error("약관 테스트 항목이 없습니다");
    const unknown = [{ ...firstItem, version: "9.9" }];
    render(<TermsAgreementSection items={unknown} selection={{ TOS: true }} onChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: /이용약관에 동의합니다/ })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("alert").textContent).toContain("약관 버전이 갱신되었습니다");
    expect(screen.getByRole("checkbox", { name: "필수 약관 전체 동의" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(areRequiredTermsAgreed(unknown, { TOS: true })).toBe(false);
  });

  it("선택 동의 버전만 맞지 않아도 필수 동의를 마치면 가입할 수 있다", () => {
    const items = ITEMS.map((item) =>
      item.termsCode === "MARKETING" ? { ...item, version: "9.9" } : item,
    );
    render(<TermsAgreementSection items={items} selection={{ TOS: true }} onChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: /공지·혜택 안내를 받고/ })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("status").textContent).toContain("가입은 계속할 수 있습니다");
    expect(areRequiredTermsAgreed(items, { TOS: true })).toBe(true);
    expect(selectedSignupAgreements(items, { TOS: true, MARKETING: true })).toEqual([
      { termsCode: "TOS", version: "1.0" },
    ]);
  });

  it("이메일이 없어서 숨긴 마케팅 버전 불일치는 가입을 막지 않는다", () => {
    const items = ITEMS.map((item) =>
      item.termsCode === "MARKETING" ? { ...item, version: "9.9" } : item,
    );
    render(
      <TermsAgreementSection
        items={items}
        selection={{ TOS: true }}
        onChange={() => {}}
        hasLoginEmail={false}
      />,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(areRequiredTermsAgreed(items, { TOS: true }, false)).toBe(true);
    expect(selectedSignupAgreements(items, { TOS: true, MARKETING: true }, false)).toEqual([
      { termsCode: "TOS", version: "1.0" },
    ]);
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
    expect(document.querySelectorAll("label span.text-muted")).toHaveLength(2);
  });
});
