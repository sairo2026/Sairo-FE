import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { findLegalDocument, findPreviousLegalDocument } from "./registry";

describe("이용약관과 개인정보처리방침의 사실 정정", () => {
  it("FE 1.1 원문 해시는 BE V32 카탈로그 해시와 일치한다", () => {
    const expected = {
      terms: "2a9fae7a75eef01efdce8b33cc7a195fa74c92bc762c683472152ff480c5ef94",
      privacy: "371004f23c65f23e841feb1e20ca89251ad32b226e2bae7decf12aa2e6461cd4",
      "subscription-terms": "011d39a2d4c8a1cf4ca253d0299a0a07ca00f9e72d8820404f3baedd118b7d86",
    } as const;
    for (const [slug, hash] of Object.entries(expected)) {
      const document = findLegalDocument(slug);
      expect(document?.version).toBe("1.1");
      if (!document) throw new Error(`${slug} 약관이 없습니다`);
      expect(
        createHash("sha256").update(document.body.replaceAll("\r\n", "\n"), "utf8").digest("hex"),
      ).toBe(hash);
    }
  });
  it("두 문서는 새 시행 버전을 쓴다", () => {
    expect(findLegalDocument("terms")?.version).toBe("1.1");
    expect(findLegalDocument("privacy")?.version).toBe("1.1");
  });

  it("이용약관은 문자 인증을 가입 조건으로 단정하지 않는다", () => {
    const terms = findLegalDocument("terms");
    if (!terms) throw new Error("이용약관이 없습니다");
    expect(terms.body).not.toContain("휴대폰 번호 인증을 마쳐야 합니다");
    expect(terms.body).toContain(
      "문자 인증을 제공하지 않는 동안에는 입력한 번호를 인증 없이 저장하며",
    );
  });

  it("개인정보처리방침은 암호화하지 않는 항목을 암호화한다고 적지 않는다", () => {
    const privacy = findLegalDocument("privacy");
    if (!privacy) throw new Error("개인정보처리방침이 없습니다");
    expect(privacy.body).not.toContain("카카오 식별자와 연락처의 암호화 저장");
    expect(privacy.body).toContain("데이터베이스와 파일 저장소의 저장 시 암호화");
    expect(privacy.body).toContain("승인자 연락처와 비회원 권리 요청 연락처");
  });

  it("회원 탈퇴 조건은 유일한 대표가 아니라 대표 권한을 가진 회원 전체에 적용한다", () => {
    const terms = findLegalDocument("terms");
    if (!terms) throw new Error("이용약관이 없습니다");
    expect(terms.body).not.toContain("유일한 대표");
    expect(terms.body).toContain(
      "사무소의 대표 권한을 가진 회원은 모두 다른 구성원에게 대표를 이전하거나 사무소를 종료해 대표가 아니게 된 뒤에 탈퇴할 수 있습니다",
    );
  });

  it("약관 변경 안내는 실제 알림 방식인 서비스 안 알림과 이메일로 적는다", () => {
    const terms = findLegalDocument("terms");
    if (!terms) throw new Error("이용약관이 없습니다");
    expect(terms.body).not.toContain("대표 계정 이메일로 알립니다");
    expect(terms.body).toContain(
      "서비스 안 알림으로 알리며 이메일 주소가 있는 경우 같은 내용을 이메일로도 알립니다",
    );
  });

  it("개인정보 보관 기간 표는 삭제 작업이 없는 알림 90일 보관을 적지 않는다", () => {
    const privacy = findLegalDocument("privacy");
    if (!privacy) throw new Error("개인정보처리방침이 없습니다");
    expect(privacy.body).not.toContain("| 알림 | 90일 |");
    expect(privacy.body).toContain(
      "| 알림 | 사무소의 반환 기간이 끝나 일반 업무 데이터를 파기할 때 함께 삭제 |",
    );
  });

  it("이전 시행 버전 본문은 시행일 없이 직전 버전을 보여준다", () => {
    for (const slug of ["terms", "privacy", "subscription-terms", "refund-policy"] as const) {
      const current = findLegalDocument(slug);
      const previous = findPreviousLegalDocument(slug, "1.0");
      expect(current?.effectiveDate).toBeTruthy();
      expect(previous?.version).toBe("1.0");
      expect(previous?.effectiveDate).toBeUndefined();
      expect(previous?.body).not.toBe(current?.body);
    }
    expect(findPreviousLegalDocument("terms", "0.9")).toBeUndefined();
    expect(findPreviousLegalDocument("marketing", "1.0")).toBeUndefined();
  });

  it("개인정보처리방침의 인증 시각 안내는 문자 인증 제공 여부에 따른다", () => {
    const privacy = findLegalDocument("privacy");
    if (!privacy) throw new Error("개인정보처리방침이 없습니다");
    expect(privacy.body).toContain("인증 시각은 문자 인증을 제공하는 동안에만 기록");
  });
});
