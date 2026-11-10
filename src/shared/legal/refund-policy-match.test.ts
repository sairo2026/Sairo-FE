import { describe, expect, it } from "vitest";
import { REFUND_BODY } from "./documents/refund";

const TOSS_REFUND_POLICY_INPUT =
  "사이로는 월 선불 자동결제 구독 서비스입니다. 무료 체험 기간에는 결제가 발생하지 않습니다. 해지는 언제든 신청할 수 있고, 해지를 예약하면 이미 결제한 이용기간이 끝날 때까지 서비스를 이용할 수 있으며 다음 결제부터 청구되지 않습니다. 이 경우 이미 결제한 기간의 환불은 없습니다. 바로 종료를 선택하거나 사무소 인증이 중단된 경우, 또는 사이로의 서비스 장애가 있는 경우에는 남은 이용기간을 일할 계산하여 환불합니다. 결제 오류나 중복 결제는 전액 환불합니다. 환불은 결제 내역 화면에서 신청하며 결제하신 수단으로 처리됩니다. 문의는 고객센터로 접수해 주세요.";

describe("환불정책 본문과 가맹 신청 입력문", () => {
  it("환불정책 1절은 가맹 신청에 입력한 문장과 한 글자도 다르지 않다", () => {
    const section = REFUND_BODY.split("#### 1. 환불정책 요약")[1]?.split("#### 2.")[0]?.trim();
    expect(section).toBe(TOSS_REFUND_POLICY_INPUT);
  });
});
