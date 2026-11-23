import { describe, expect, it } from "vitest";
import { REFUND_GUIDE_COPY } from "@/features/billing/model/legal-copy";
import { findLegalDocument } from "./registry";

describe("환불정책의 사실 정정", () => {
  it("환불정책은 새 시행 버전을 쓴다", () => {
    expect(findLegalDocument("refund-policy")?.version).toBe("1.1");
  });

  it("회원 탈퇴만으로 일할 환불이 접수된다고 적지 않는다", () => {
    const refund = findLegalDocument("refund-policy");
    if (!refund) throw new Error("환불정책이 없습니다");
    expect(refund.body).not.toContain("회원 탈퇴나 사무소 즉시 종료");
    expect(refund.body).toContain("회원 탈퇴는 환불을 접수하지 않으며");
  });

  it("환불 신청 경로를 사유별로 나누어 적고 신청과 무관한 전액 환불을 약속하지 않는다", () => {
    const refund = findLegalDocument("refund-policy");
    if (!refund) throw new Error("환불정책이 없습니다");
    expect(refund.body).not.toContain("신청과 관계없이");
    expect(refund.body).toContain("종료 또는 중단 시점에 시스템이 접수합니다");
    expect(refund.body).toContain("서비스 장애의 환불은 결제 내역 화면의 신청 사유에 없으므로");
  });

  it("서비스 장애 환불은 일할 계산이 아니라 회사가 정한 금액으로 적고 종료 뒤 승인 결제는 사무소 종료 뒤로 한정한다", () => {
    const refund = findLegalDocument("refund-policy");
    if (!refund) throw new Error("환불정책이 없습니다");
    expect(refund.body).toContain(
      "회사가 장애의 영향을 확인해 정한 금액이며 이미 결제한 금액을 넘지 않습니다",
    );
    expect(refund.body).toContain(
      "사무소를 종료한 뒤 결제 승인 지연이나 시스템 오류로 승인된 금액",
    );
    expect(refund.body).toContain(
      "사무소를 종료한 뒤 승인된 결제는 시스템이 전액 환불 요청으로 접수하고 운영자가 환불 금액을 확인합니다",
    );
  });

  it("회원 탈퇴 조건은 유일한 대표가 아니라 대표 전체에 적용한다", () => {
    const refund = findLegalDocument("refund-policy");
    if (!refund) throw new Error("환불정책이 없습니다");
    expect(refund.body).not.toContain("유일한 대표");
    expect(refund.body).toContain("대표를 이전해 대표가 아니게 된 뒤에 탈퇴할 수 있습니다");
  });

  it("영업일 3일 검토는 노력 의무로 적는다", () => {
    const refund = findLegalDocument("refund-policy");
    if (!refund) throw new Error("환불정책이 없습니다");
    expect(refund.body).toContain("영업일 기준 3일 안에 검토 결과를 알리도록 노력합니다");
  });

  it("환불 기준 안내 표는 환불정책 2절 표의 사유 문구와 같다", () => {
    const refund = findLegalDocument("refund-policy");
    if (!refund) throw new Error("환불정책이 없습니다");
    for (const [reason, amount] of REFUND_GUIDE_COPY.rows) {
      expect(refund.body).toContain(`| ${reason} | ${amount} |`);
    }
  });
});
