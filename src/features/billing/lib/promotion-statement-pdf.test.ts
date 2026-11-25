import { readFile } from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { PromotionPeriod } from "../api/wire";
import { createPromotionStatementPdf } from "./promotion-statement-pdf";

const period: PromotionPeriod = {
  id: 17,
  periodStart: "2027-01-31T14:30:00+09:00",
  periodEnd: "2027-02-28T14:30:00+09:00",
  listAmount: 49900,
  discountAmount: 49900,
  chargedAmount: 0,
  priceVersion: "2027-01",
  createdAt: "2027-01-31T14:30:01+09:00",
  campaignName: "출시 프로모션",
  campaignCode: "LAUNCH",
  officeName: "테스트 공인중개사사무소",
  plan: "SOLO",
  freeEndsAt: "2027-02-28T14:30:00+09:00",
};

describe("무료 프로모션 PDF", () => {
  it("한글 글꼴을 포함한 한 페이지 이용내역서를 생성한다", async () => {
    const font = await readFile("public/fonts/Pretendard-Regular.ttf");
    expect(fontkit.create(font).hasGlyphForCodePoint("한".codePointAt(0) ?? 0)).toBe(true);
    const bytes = await createPromotionStatementPdf(period, font);
    expect(new TextDecoder("ascii").decode(bytes.slice(0, 5))).toBe("%PDF-");
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
    expect(document.getTitle()).toBe("무료 프로모션 이용내역서");
    const raw = new TextDecoder("latin1").decode(bytes);
    expect(raw).toContain("/ToUnicode");
    expect(raw).toContain("/FontFile2");
    expect(bytes.length).toBeGreaterThan(10000);
  });

  it("실제 청구액 또는 할인액이 맞지 않는 거래는 0원 문서로 생성하지 않는다", async () => {
    const font = await readFile("public/fonts/Pretendard-Regular.ttf");
    await expect(
      createPromotionStatementPdf({ ...period, chargedAmount: 100 }, font),
    ).rejects.toThrow("금액이 일치하지 않습니다");
    await expect(
      createPromotionStatementPdf({ ...period, discountAmount: 100 }, font),
    ).rejects.toThrow("금액이 일치하지 않습니다");
  });

  it("긴 한글 이름과 글꼴에 없는 문자를 포함해도 PDF를 생성한다", async () => {
    const font = await readFile("public/fonts/Pretendard-Regular.ttf");
    const bytes = await createPromotionStatementPdf(
      { ...period, officeName: "가".repeat(150) + "😀", campaignName: "나".repeat(100) },
      font,
    );
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
  });
});
