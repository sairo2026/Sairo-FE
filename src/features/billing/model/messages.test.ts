import { describe, expect, it } from "vitest";
import { COPY, describePaymentResult } from "./messages";

describe("결제 요청 결과 안내", () => {
  it("결제 완료(PAID)일 때만 완료로 안내한다", () => {
    expect(describePaymentResult({ status: "ACTIVE", paymentStatus: "PAID" }, false)).toBe(
      COPY.payDone,
    );
  });

  it("처리 중이거나 확인 중이면 구독 상태가 ACTIVE여도 확인 중으로 안내한다", () => {
    expect(describePaymentResult({ status: "ACTIVE", paymentStatus: "PROCESSING" }, false)).toBe(
      COPY.payVerifying,
    );
    expect(
      describePaymentResult({ status: "PRE_PAYMENT", paymentStatus: "VERIFYING" }, false),
    ).toBe(COPY.payVerifying);
  });

  it("결과 값이 없는 응답은 구독 상태와 확인 중 여부로 판단한다", () => {
    expect(describePaymentResult({ status: "ACTIVE" }, false)).toBe(COPY.payDone);
    expect(describePaymentResult({ status: "PRE_PAYMENT" }, false)).toBe(COPY.payAccepted);
    expect(describePaymentResult({ status: "ACTIVE", paymentStatus: null }, true)).toBe(
      COPY.payVerifying,
    );
  });
});
