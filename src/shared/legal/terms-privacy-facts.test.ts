import { describe, expect, it } from "vitest";
import { findLegalDocument } from "./registry";

describe("이용약관과 개인정보처리방침의 사실 정정", () => {
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
    expect(privacy.body).not.toContain("데이터베이스와 파일 저장소의 암호화");
    expect(privacy.body).toContain("승인자 연락처와 비회원 권리 요청 연락처");
  });

  it("개인정보처리방침의 인증 시각 안내는 문자 인증 제공 여부에 따른다", () => {
    const privacy = findLegalDocument("privacy");
    if (!privacy) throw new Error("개인정보처리방침이 없습니다");
    expect(privacy.body).toContain("인증 시각은 문자 인증을 제공하는 동안에만 기록");
  });
});
