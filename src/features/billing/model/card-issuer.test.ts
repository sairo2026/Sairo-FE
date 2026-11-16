import { describe, expect, it } from "vitest";
import { cardIssuerName, cardLabel } from "./card-issuer";

describe("cardIssuerName", () => {
  it("토스 발급사 코드를 이름으로 바꾼다", () => {
    expect(cardIssuerName("24")).toBe("토스뱅크");
    expect(cardIssuerName("11")).toBe("KB국민카드");
    expect(cardIssuerName("3A")).toBe("케이뱅크");
    expect(cardIssuerName("3a")).toBe("케이뱅크");
    expect(cardIssuerName("91")).toBe("NH농협카드");
  });

  it("코드표에 없는 코드나 빈 값은 카드로 표시한다", () => {
    expect(cardIssuerName("99")).toBe("카드");
    expect(cardIssuerName("")).toBe("카드");
    expect(cardIssuerName(null)).toBe("카드");
  });

  it("이미 이름이면 그대로 둔다", () => {
    expect(cardIssuerName("신한카드")).toBe("신한카드");
  });
});

describe("cardLabel", () => {
  it("발급사 이름과 끝자리를 함께 보여준다", () => {
    expect(cardLabel("24", "0000")).toBe("토스뱅크 끝자리 0000");
    expect(cardLabel(null, null)).toBe("카드 끝자리 ----");
  });
});
