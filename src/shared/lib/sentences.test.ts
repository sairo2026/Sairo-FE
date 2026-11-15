import { describe, expect, it } from "vitest";
import { breakSentences, breakSentencesIn } from "./sentences";

describe("문장 줄바꿈", () => {
  it("세 문장 이상이면 문장 끝마다 줄을 바꾸고 글 내용은 그대로 둔다", () => {
    const text = "첫째입니다. 둘째입니다. 셋째입니다.";
    const result = breakSentences(text);
    expect(result).toBe("첫째입니다.\n둘째입니다.\n셋째입니다.");
    expect(result.replace(/\n/g, " ")).toBe(text);
  });

  it("두 문장 이하는 그대로 둔다", () => {
    expect(breakSentences("첫째입니다. 둘째입니다.")).toBe("첫째입니다. 둘째입니다.");
  });

  it("소수점이나 금액 속 마침표에서는 줄을 바꾸지 않는다", () => {
    expect(breakSentences("1.5배입니다. 둘째입니다. 셋째입니다.")).toBe(
      "1.5배입니다.\n둘째입니다.\n셋째입니다.",
    );
  });

  it("문자열이 아닌 children은 건드리지 않는다", () => {
    const node = { type: "a" };
    expect(breakSentencesIn(node)).toBe(node);
    expect(breakSentencesIn(["가. ", "나. ", "다."])).toBe("가.\n나.\n다.");
  });
});
