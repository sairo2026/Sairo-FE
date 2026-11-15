import { describe, expect, it } from "vitest";
import { createIdempotencyKeyHolder } from "./idempotency-key";

describe("createIdempotencyKeyHolder", () => {
  it("같은 본문으로 다시 요청하면 같은 키를 돌려준다", () => {
    const holder = createIdempotencyKeyHolder();
    const first = holder.keyFor({ name: "매물", categoryId: 6 });
    expect(holder.keyFor({ name: "매물", categoryId: 6 })).toBe(first);
  });

  it("본문이 바뀌면 새 키를 쓴다", () => {
    const holder = createIdempotencyKeyHolder();
    const first = holder.keyFor({ name: "매물" });
    const second = holder.keyFor({ name: "매물 수정" });
    expect(second).not.toBe(first);
    expect(holder.keyFor({ name: "매물 수정" })).toBe(second);
  });

  it("성공해서 버리면 다음 요청은 새 키를 쓴다", () => {
    const holder = createIdempotencyKeyHolder();
    const first = holder.keyFor({ name: "매물" });
    holder.discard();
    expect(holder.keyFor({ name: "매물" })).not.toBe(first);
  });

  it("공백 없이 1자 이상 100자 이하의 키를 만든다", () => {
    const key = createIdempotencyKeyHolder().keyFor({});
    expect(key).toMatch(/^\S{1,100}$/);
  });

  it("보안 컨텍스트가 아니어도 키를 만든다", () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
    try {
      expect(createIdempotencyKeyHolder().keyFor({})).toMatch(/^\S{1,100}$/);
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
    }
  });

  it("홀더마다 키가 다르다", () => {
    const a = createIdempotencyKeyHolder().keyFor({});
    const b = createIdempotencyKeyHolder().keyFor({});
    expect(a).not.toBe(b);
  });
});
