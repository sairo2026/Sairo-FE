import { describe, expect, it } from "vitest";
import { findLegalDocument } from "./registry";

function subscriptionTerms(): string {
  const document = findLegalDocument("subscription-terms");
  if (!document) throw new Error("구독·결제 약관이 없습니다");
  return document.body;
}

describe("구독·결제 약관의 사실 정정", () => {
  it("구독·결제 약관은 새 시행 버전을 쓴다", () => {
    expect(findLegalDocument("subscription-terms")?.version).toBe("1.1");
  });

  it("재시도 시각은 청구 예정 시각 기준이고 실패 사유는 네 가지로 안내한다", () => {
    const body = subscriptionTerms();
    expect(body).not.toContain("최초 실패 시각부터");
    expect(body).toContain("청구 예정 시각부터 1시간 뒤, 3일 뒤, 7일 뒤");
    expect(body).toContain("최초 시도를 포함해 최대 4회");
    expect(body).toContain(
      "카드 사용 불가, 잔액 또는 한도 부족, 결제사 응답 지연, 결제사 처리 실패의 네 가지",
    );
  });

  it("결제 실패, 제한 시작, 미납 종료 때 대표에게 알리는 기준을 적는다", () => {
    const body = subscriptionTerms();
    expect(body).toContain("서비스 안 알림과 이메일로 알립니다");
    expect(body).toContain(
      "종료 안내 이메일에는 자료를 조회하고 내려받을 수 있는 반환 기간이 끝나는 시각",
    );
  });

  it("바로 종료와 회원 탈퇴를 환불 사유로 적지 않는다", () => {
    const body = subscriptionTerms();
    expect(body).not.toContain("회원 탈퇴로 사무소 이용이 끝나는 경우");
    expect(body).not.toContain("바로 종료를 선택");
    expect(body).toContain("사무소를 지금 바로 종료하거나 사무소 인증이 중단된 경우에는");
    expect(body).toContain("중복 결제와 잘못 결제된 금액의 환불은 결제 내역 화면에서 신청하며");
  });
});
