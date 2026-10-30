import { describe, expect, it } from "vitest";
import { isComingSoonMode } from "./coming-soon-gate";

describe("isComingSoonMode", () => {
  it("운영 배포에서는 플래그가 없어도 켜진다", () => {
    expect(isComingSoonMode({ VERCEL_ENV: "production" })).toBe(true);
  });

  it("미리보기 배포와 로컬에서는 꺼진다", () => {
    expect(isComingSoonMode({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isComingSoonMode({})).toBe(false);
  });

  it("COMING_SOON이 true면 어느 환경에서든 켜진다", () => {
    expect(isComingSoonMode({ COMING_SOON: "true" })).toBe(true);
    expect(isComingSoonMode({ COMING_SOON: "true", VERCEL_ENV: "preview" })).toBe(true);
  });

  it("COMING_SOON이 false면 운영 배포에서도 꺼진다", () => {
    expect(isComingSoonMode({ COMING_SOON: "false", VERCEL_ENV: "production" })).toBe(false);
  });
});
