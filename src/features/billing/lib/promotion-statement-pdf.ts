import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { PLAN_LABEL } from "../model/labels";
import type { PromotionPeriod } from "../api/wire";
import { isValidFreePromotionPeriod } from "./promotion-statement-guards";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const INK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.31, 0.36, 0.44);
const PRIMARY = rgb(0.2, 0.21, 0.65);

export async function createPromotionStatementPdf(
  period: PromotionPeriod,
  fontBytes: Uint8Array,
): Promise<Uint8Array> {
  if (!isValidFreePromotionPeriod(period)) {
    throw new Error("0원 프로모션 거래의 금액이 일치하지 않습니다.");
  }

  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  document.setTitle("무료 프로모션 이용내역서");
  document.setAuthor("SAIRO");
  document.setSubject("실제 카드 청구가 없는 구독 이용 내역");
  const font = await document.embedFont(fontBytes, { subset: true });
  const supportedCodePoints = new Set(font.getCharacterSet());
  const safeText = (value: string) =>
    Array.from(value, (character) =>
      supportedCodePoints.has(character.codePointAt(0) ?? 0) ? character : "?",
    ).join("");
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const draw = (value: string, size = 11, color = INK, x = MARGIN) => {
    page.drawText(safeText(value), { x, y, size, font, color });
  };
  const wrap = (value: string, size: number, maxWidth: number) => {
    const lines: string[] = [];
    let line = "";
    for (const char of safeText(value)) {
      if (line && font.widthOfTextAtSize(line + char, size) > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  const field = (label: string, value: string) => {
    draw(label, 10, MUTED);
    const lines = wrap(value, 11, PAGE_WIDTH - 2 * MARGIN - 155);
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: MARGIN + 155,
        y: y - index * 15,
        size: 11,
        font,
        color: INK,
      });
    });
    y -= Math.max(29, lines.length * 15 + 12);
  };

  draw("SAIRO", 14, PRIMARY);
  y -= 36;
  draw("무료 프로모션 이용내역서", 23);
  y -= 26;
  draw("카드 승인이나 매출전표가 발생하지 않은 내부 구독 이용 기록입니다.", 10, MUTED);
  y -= 30;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.85, 0.87, 0.91),
  });
  y -= 28;

  field("서비스", "사이로 구독 서비스");
  field("상품", PLAN_LABEL[period.plan as keyof typeof PLAN_LABEL] ?? period.plan);
  field("사무소", period.officeName);
  field("내부 이용내역 번호", String(period.id));
  field(
    "이용기간",
    `${formatSeoulDateTime(period.periodStart)} ~ ${formatSeoulDateTime(period.periodEnd)}`,
  );
  field("발급 기록 시각", formatSeoulDateTime(period.createdAt));
  field("프로모션", period.campaignName);
  field("프로모션 코드", period.campaignCode || "없음");
  field("가격 버전", period.priceVersion);
  field(
    "다음 무료 갱신 예정",
    new Date(period.periodEnd) < new Date(period.freeEndsAt)
      ? formatSeoulDateTime(period.periodEnd)
      : "없음",
  );
  field("향후 유료 청구", "자동 청구 없음 · 별도 구매 확인 필요");

  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.85, 0.87, 0.91),
  });
  y -= 26;
  field("구독 정상가", formatKrw(period.listAmount));
  field("프로모션 할인", `-${formatKrw(period.discountAmount)}`);
  field("최종 청구액", formatKrw(period.chargedAmount));
  y -= 8;
  draw(`실제 카드 청구액 ${formatKrw(period.chargedAmount)} · 카드 승인 없음`, 10);
  y -= 22;
  draw("이 문서는 카드 영수증, 매출전표 또는 세금계산서가 아닙니다.", 9, MUTED);

  if (y < MARGIN) throw new Error("이용내역서가 한 페이지에 들어가지 않습니다.");
  return document.save({ useObjectStreams: false });
}

export async function downloadPromotionStatementPdf(period: PromotionPeriod) {
  const response = await fetch("/fonts/Pretendard-Regular.ttf");
  if (!response.ok) throw new Error("이용내역서 글꼴을 불러오지 못했습니다.");
  const pdf = await createPromotionStatementPdf(
    period,
    new Uint8Array(await response.arrayBuffer()),
  );
  const blob = new Blob([new Uint8Array(pdf)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sairo-free-promotion-${period.id}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
