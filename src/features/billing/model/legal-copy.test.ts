import { describe, expect, it } from "vitest";
import { billingDayLabel, consentSummaryLine, trialNoticeText } from "./legal-copy";

describe("구독 구매 동의 요약 줄", () => {
  const base = {
    officeName: "새봄공인중개사사무소",
    memberCount: 3,
    monthlyAmount: 59900,
    firstBillingAt: "2027-01-09T00:00:00+09:00",
    nextChargeAt: "2027-02-09T00:00:00+09:00",
    cardIssuer: "신한카드",
    cardLast4: "1234",
  };

  it("문서의 요약 박스 문장대로 이어 붙인다", () => {
    expect(consentSummaryLine(base)).toBe(
      "새봄공인중개사사무소 · 사이로 월 구독 · 이용 인원 3명 · 월 59,900원(부가가치세 포함) · 첫 결제 2027-01-09 · 이후 매월 9일 자동 결제 · 결제수단 신한카드(끝자리 1234)",
    );
  });

  it("값이 없는 항목은 만들어 내지 않는다", () => {
    const line = consentSummaryLine({
      ...base,
      officeName: null,
      firstBillingAt: null,
      cardIssuer: null,
      cardLast4: null,
    });
    expect(line).toBe(
      "사이로 월 구독 · 이용 인원 3명 · 월 59,900원(부가가치세 포함) · 이후 매월 9일 자동 결제 · 결제수단 등록 전",
    );
  });

  it("청구일은 서울 기준 일자로 만든다", () => {
    expect(billingDayLabel("2027-01-31T15:30:00Z")).toBe("1일");
  });
});

describe("무료 기간 안내", () => {
  it("고정 종료 방식은 가입 마감일과 무료 종료일과 첫 결제일을 쓴다", () => {
    expect(
      trialNoticeText({
        freeEndMode: "FIXED_END",
        fixedFreeEndsAt: "2027-04-01T00:00:00+09:00",
        applicantWindowEndsAt: "2027-03-01T00:00:00+09:00",
      }),
    ).toBe(
      "2027-03-01까지 가입한 사무소는 2027-04-01까지 무료로 사용합니다. 유료 전환 전에 안내를 드리고 결제는 2027-04-02부터 시작됩니다. 결제 전에 금액과 결제일을 다시 안내하고 동의를 받습니다.",
    );
  });

  it("기간 방식은 무료 일수를 쓰고 이벤트가 없으면 아무 약속도 하지 않는다", () => {
    expect(trialNoticeText({ freeEndMode: "DURATION", durationDays: 60 })).toBe(
      "사무소 인증을 마친 날부터 60일 동안 무료로 사용합니다. 유료 전환 전에 안내를 드리고 결제 전에 금액과 결제일을 다시 안내하고 동의를 받습니다.",
    );
    expect(trialNoticeText(null)).toBeNull();
    expect(trialNoticeText({ freeEndMode: "DURATION", durationDays: null })).toBeNull();
  });
});
