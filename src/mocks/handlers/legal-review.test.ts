// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { apiFetch } from "@/shared/api/client";
import { z } from "zod";
import { server, startMockServer } from "../server";
import { REVIEW_SCENARIO_KEY, legalReviewHandlers } from "./legal-review";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  window.localStorage.removeItem(REVIEW_SCENARIO_KEY);
  server.resetHandlers();
});

afterAll(() => stopServer());

const ContextSchema = z.object({ accessCondition: z.string(), role: z.string().nullable() });

async function readContext() {
  server.use(...legalReviewHandlers);
  return apiFetch("/api/auth/context", { schema: ContextSchema, skipAuthEvents: true });
}

describe("법률 검토용 모의 응답", () => {
  it("기본은 활성 상태의 대표 계정이다", async () => {
    expect(await readContext()).toEqual({ accessCondition: "ACTIVE", role: "OWNER" });
  });

  it("시나리오 값에 따라 신규 계정으로 바뀐다", async () => {
    window.localStorage.setItem(REVIEW_SCENARIO_KEY, "new-account");
    expect(await readContext()).toEqual({ accessCondition: "PRE_VERIFICATION", role: null });
  });

  it("재동의 시나리오는 재동의 목록을 돌려주고 다른 상태에서는 기본 응답으로 넘긴다", async () => {
    server.use(...legalReviewHandlers);
    const Schema = z.object({ reconsentRequired: z.boolean(), items: z.array(z.unknown()) });
    window.localStorage.setItem(REVIEW_SCENARIO_KEY, "reconsent");
    const reconsent = await apiFetch("/api/me/terms-reconsent", {
      schema: Schema,
      skipAuthEvents: true,
    });
    expect(reconsent.items).toHaveLength(2);
    window.localStorage.removeItem(REVIEW_SCENARIO_KEY);
    const plain = await apiFetch("/api/me/terms-reconsent", {
      schema: Schema,
      skipAuthEvents: true,
    });
    expect(plain.reconsentRequired).toBe(false);
  });

  it("탈퇴 시나리오는 유일한 대표와 카카오 연결 상태를 만든다", async () => {
    server.use(...legalReviewHandlers);
    const Schema = z.object({ isLastOwner: z.boolean(), kakaoLinked: z.boolean() });
    window.localStorage.setItem(REVIEW_SCENARIO_KEY, "last-owner");
    expect(
      await apiFetch("/api/me/withdrawal-preview", { schema: Schema, skipAuthEvents: true }),
    ).toEqual({ isLastOwner: true, kakaoLinked: true });
    window.localStorage.setItem(REVIEW_SCENARIO_KEY, "kakao-account");
    expect(
      await apiFetch("/api/me/withdrawal-preview", { schema: Schema, skipAuthEvents: true }),
    ).toEqual({ isLastOwner: false, kakaoLinked: true });
  });
});
