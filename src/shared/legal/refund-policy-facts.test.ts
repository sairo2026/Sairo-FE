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
    expect(refund.body).toContain(
      "서비스 장애와 결제 승인 지연의 환불은 결제 내역 화면의 신청 사유에 없으므로",
    );
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
