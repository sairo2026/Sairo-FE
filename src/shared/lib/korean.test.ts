import { describe, expect, it } from "vitest";
import { instrumentalParticle, objectParticle, subjectParticle, topicParticle } from "./korean";

describe("조사 붙이기", () => {
  it("받침 유무에 따라 이/가, 은/는, 을/를을 고른다", () => {
    expect(subjectParticle("사무소")).toBe("사무소가");
    expect(subjectParticle("행복공인")).toBe("행복공인이");
    expect(topicParticle("매매가")).toBe("매매가는");
    expect(topicParticle("월세")).toBe("월세는");
    expect(topicParticle("보증금")).toBe("보증금은");
    expect(objectParticle("신분증 확인")).toBe("신분증 확인을");
  });

  it("숫자는 읽는 소리의 받침으로 고른다", () => {
    expect(objectParticle("1")).toBe("1을");
    expect(objectParticle("2")).toBe("2를");
    expect(objectParticle("3")).toBe("3을");
    expect(objectParticle("5")).toBe("5를");
  });

  it("로·으로는 받침이 없거나 ㄹ 받침이면 로를 쓴다", () => {
    expect(instrumentalParticle("고객지원")).toBe("고객지원으로");
    expect(instrumentalParticle("사무소")).toBe("사무소로");
    expect(instrumentalParticle("02-123-4567")).toBe("02-123-4567로");
    expect(instrumentalParticle("02-123-4560")).toBe("02-123-4560으로");
    expect(instrumentalParticle("서울")).toBe("서울로");
  });
});
