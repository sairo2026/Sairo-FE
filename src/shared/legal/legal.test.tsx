// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LegalMarkdown, legalTocEntries, prepareLegalBlocks } from "./legal-markdown";
import { parseMarkdown, pruneEmptyBlocks } from "./markdown";
import { resolveLegalPlaceholders } from "./placeholders";
import {
  LEGAL_DOCUMENTS,
  findLegalDocument,
  findLegalDocumentByPolicyKind,
  findLegalDocumentByTermsCode,
} from "./registry";

afterEach(cleanup);

describe("마크다운 해석", () => {
  it("제목, 번호 목록, 중첩 목록, 표를 블록으로 나눈다", () => {
    const blocks = parseMarkdown(
      [
        "#### 제1조 (목적)",
        "",
        "1. 첫째",
        "2. 둘째",
        "   - 하위 가",
        "   - 하위 나",
        "",
        "3. 셋째",
        "",
        "| 열1 | 열2 |",
        "| --- | --- |",
        "| 가 | 나 |",
        "",
        "문단 첫 줄",
        "문단 둘째 줄",
        "---",
      ].join("\n"),
    );
    expect(blocks.map((block) => block.type)).toEqual([
      "heading",
      "list",
      "table",
      "paragraph",
      "rule",
    ]);
    const list = blocks[1];
    if (list?.type !== "list") throw new Error("목록이 아닙니다");
    expect(list.items.map((item) => item.marker)).toEqual(["1.", "2.", "3."]);
    expect(list.items[1]?.children).toEqual(["하위 가", "하위 나"]);
    const table = blocks[2];
    if (table?.type !== "table") throw new Error("표가 아닙니다");
    expect(table.rows).toEqual([["가", "나"]]);
  });

  it("행이 없는 표와 내용이 없는 절 제목을 걷어 낸다", () => {
    const pruned = pruneEmptyBlocks(
      parseMarkdown("#### 부칙\n\n#### 별표\n\n내용\n\n| a | b |\n| --- | --- |"),
    );
    expect(pruned).toEqual([
      { type: "heading", level: 4, text: "별표" },
      { type: "paragraph", lines: ["내용"] },
    ]);
  });

  it("HTML 태그와 스크립트를 삽입하지 않고 글자 그대로 보여준다", () => {
    const source = [
      "문단 <script>alert(1)</script> <img src=x onerror=alert(1)>",
      "",
      "1. <b>굵게</b>",
      "",
      "| <i>열</i> | b |",
      "| --- | --- |",
      '| <a href="x">링크</a> | d |',
    ].join("\n");
    const { container } = render(<LegalMarkdown blocks={parseMarkdown(source)} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("i")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });
});

describe("값 채우기", () => {
  it("값이 있으면 채우고 없으면 그 줄을 만들어 내지 않는다", () => {
    const source = [
      "시행 버전 {버전} / 시행일 {시행일}",
      "- 연락처 {연락처}, 이메일 {지원 이메일}",
      "| 수탁사 | 지역 |",
      "| --- | --- |",
      "| A | 서울 |",
      "| {문자 발송 수탁사 상호} | {문자 발송 처리 지역} |",
      "이 약관은 {시행일}부터 시행합니다.",
    ].join("\n");
    expect(
      resolveLegalPlaceholders(source, { 버전: "1.0", "지원 이메일": "support@example.com" }),
    ).toBe(
      [
        "시행 버전 1.0",
        "- 이메일 support@example.com",
        "| 수탁사 | 지역 |",
        "| --- | --- |",
        "| A | 서울 |",
      ].join("\n"),
    );
    expect(
      resolveLegalPlaceholders("시행 버전 {버전} / 시행일 {시행일}", {
        버전: "1.0",
        시행일: "2026년 12월 1일",
      }),
    ).toBe("시행 버전 1.0 / 시행일 2026년 12월 1일");
  });
});

describe("약관 문서 목록", () => {
  it("매핑표의 약관 코드와 정책 종류로 본문을 찾는다", () => {
    expect(findLegalDocumentByTermsCode("TOS")?.slug).toBe("terms");
    expect(findLegalDocumentByTermsCode("PRIVACY")?.slug).toBe("privacy");
    expect(findLegalDocumentByTermsCode("MARKETING")?.slug).toBe("marketing");
    expect(findLegalDocumentByTermsCode("SUBSCRIPTION_PURCHASE")?.slug).toBe("subscription-terms");
    expect(findLegalDocumentByTermsCode("CARD_REGISTRATION")).toBeUndefined();
    expect(findLegalDocumentByPolicyKind("refund")?.slug).toBe("refund-policy");
    expect(findLegalDocumentByPolicyKind("SUBPROCESSORS")?.slug).toBe("processing-outsourcing");
    expect(findLegalDocument("없는 문서")).toBeUndefined();
  });

  it.each(LEGAL_DOCUMENTS.map((document) => [document.title, document] as const))(
    "%s 본문은 목차를 만들고 초안 표기와 남은 값 표시를 넣지 않는다",
    (_title, document) => {
      const blocks = prepareLegalBlocks(document.body, { 버전: document.version });
      expect(legalTocEntries(blocks).length).toBeGreaterThan(0);
      const { container } = render(<LegalMarkdown blocks={blocks} />);
      expect(container.textContent).not.toMatch(/초안|변호사 검토|문서 기록/);
      expect(container.textContent).not.toMatch(/\{[^{}]+\}/);
    },
  );

  it("이용약관은 23개 조항과 별표를 가지고 시행일이 없으면 부칙을 만들지 않는다", () => {
    const terms = findLegalDocument("terms");
    if (!terms) throw new Error("이용약관이 없습니다");
    const blocks = prepareLegalBlocks(terms.body, { 버전: "1.0" });
    render(<LegalMarkdown blocks={blocks} />);
    expect(legalTocEntries(blocks)).toHaveLength(24);
    expect(screen.getByRole("heading", { name: "제23조 (준거법과 관할)" })).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "별표 서비스에서 제공하지 않는 기능" }),
    ).not.toBeNull();
    expect(screen.queryByRole("heading", { name: "부칙" })).toBeNull();
  });

  it("개인정보처리방침의 수탁사 표는 값이 없는 행을 게시하지 않는다", () => {
    const privacy = findLegalDocument("privacy");
    if (!privacy) throw new Error("개인정보처리방침이 없습니다");
    render(<LegalMarkdown blocks={prepareLegalBlocks(privacy.body, { 버전: "1.0" })} />);
    const outsourcing = screen
      .getAllByRole("table")
      .find((table) => within(table).queryByText("Amazon Web Services"));
    if (!outsourcing) throw new Error("수탁사 표가 없습니다");
    expect(within(outsourcing).getAllByRole("row")).toHaveLength(5);
    expect(within(outsourcing).queryByText(/문자 발송 업체/)).toBeNull();
  });
});
