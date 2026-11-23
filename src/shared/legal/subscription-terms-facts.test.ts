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

  it("재시도 시각은 청구 예정 시각 기준이고 실패 사유는 화면에 표시되는 세 구분으로 안내한다", () => {
    const body = subscriptionTerms();
    expect(body).not.toContain("최초 실패 시각부터");
    expect(body).toContain("청구 예정 시각부터 1시간 뒤, 3일 뒤, 7일 뒤");
    expect(body).toContain("최초 시도를 포함해 최대 4회");
    expect(body).toContain(
      "결제 내역의 청구서 상세에서 한도 초과, 카드 정지나 만료, 기타 수준으로 안내하고",
    );
  });

  it("결제 실패, 제한 시작, 미납 종료 때 대표에게 알리는 기준을 적는다", () => {
    const body = subscriptionTerms();
    expect(body).toContain(
      "서비스 안 알림을 남기고 이메일 주소가 있는 대표에게는 같은 알림 문장을 이메일로 보냅니다",
    );
    expect(body).not.toContain("서비스 안 알림과 이메일로 알립니다");
    expect(body).not.toContain("결제 실패 안내 이메일에는");
  });

  it("바로 종료와 회원 탈퇴를 환불 사유로 적지 않는다", () => {
    const body = subscriptionTerms();
    expect(body).not.toContain("회원 탈퇴로 사무소 이용이 끝나는 경우");
    expect(body).not.toContain("바로 종료를 선택");
    expect(body).toContain("사무소를 지금 바로 종료하거나 사무소 인증이 중단된 경우에는");
    expect(body).toContain("중복 결제와 잘못 결제된 금액의 환불은 결제 내역 화면에서 신청하며");
  });

  it("회원 탈퇴 조건은 대표 전체에 적용하고 서비스 장애 환불은 회사가 정한 금액으로 적는다", () => {
    const body = subscriptionTerms();
    expect(body).not.toContain("유일한 대표");
    expect(body).toContain("대표를 이전해 대표가 아니게 된 뒤에 탈퇴할 수 있습니다");
    expect(body).toContain(
      "회사가 장애의 영향을 확인해 환불 금액을 정하며 이미 결제한 금액을 넘지 않고",
    );
    expect(body).not.toContain("장애가 영향을 준 기간을 반영해");
  });

  it("처리에 실패한 환불은 운영자가 다시 처리한다고 적는다", () => {
    expect(subscriptionTerms()).toContain("처리에 실패한 환불은 운영자가 확인해 다시 처리합니다");
  });
});
