import { describe, expect, it } from "vitest";
import { z } from "zod";
import { LoginRequestSchema, TermsReconsentResponseSchema } from "./auth.schema";
import { AuthContextResponseSchema, CurrentSessionResponseSchema } from "./common.schema";
import { ApiErrorBodySchema } from "./errors";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  buildPageSearchParams,
  isPageSize,
  pageResponseSchema,
  totalPages,
} from "./pagination";
import { OpsMeResponseSchema } from "./ops-session.schema";

describe("공통 오류 본문 스키마", () => {
  it("상태별 선택 필드를 모두 받는다", () => {
    const parsed = ApiErrorBodySchema.parse({
      code: "VISIT_REQUEST_QUOTA_EXCEEDED",
      message: "한도 초과",
      traceId: "t-1",
      retryAfterSeconds: 30,
      quotaScope: "MEMBERSHIP",
      limit: 40,
      current: 40,
      fieldErrors: [{ field: "size", code: "OUT_OF_RANGE", message: "범위 밖" }],
    });
    expect(parsed.quotaScope).toBe("MEMBERSHIP");
    expect(parsed.fieldErrors?.[0]?.code).toBe("OUT_OF_RANGE");
  });

  it("코드와 메시지가 없으면 거절한다", () => {
    expect(ApiErrorBodySchema.safeParse({ message: "m" }).success).toBe(false);
    expect(ApiErrorBodySchema.safeParse({ code: "C" }).success).toBe(false);
  });

  it("알 수 없는 한도 종류는 거절한다", () => {
    expect(ApiErrorBodySchema.safeParse({ code: "C", message: "m", quotaScope: "X" }).success).toBe(
      false,
    );
  });
});

describe("페이지네이션 계약", () => {
  const schema = pageResponseSchema(z.object({ id: z.number() }));

  it("items, page, size, totalElements를 검증한다", () => {
    const parsed = schema.parse({ items: [{ id: 1 }], page: 0, size: 25, totalElements: 1 });
    expect(parsed.items).toHaveLength(1);
    expect(schema.safeParse({ items: [], page: -1, size: 25, totalElements: 0 }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ items: [{ id: "x" }], page: 0, size: 25, totalElements: 1 }).success,
    ).toBe(false);
  });

  it("크기는 25, 50, 100만 허용하고 기본은 25다", () => {
    expect(PAGE_SIZES).toEqual([25, 50, 100]);
    expect(DEFAULT_PAGE_SIZE).toBe(25);
    expect(isPageSize(50)).toBe(true);
    expect(isPageSize(20)).toBe(false);
  });

  it("요청 쿼리에 0부터 시작하는 페이지와 쉼표로 이은 상태를 담는다", () => {
    expect(buildPageSearchParams().toString()).toBe("page=0&size=25");
    expect(buildPageSearchParams({ page: 2, size: 50, status: ["A", "B"] }).toString()).toBe(
      "page=2&size=50&status=A%2CB",
    );
  });

  it("전체 쪽 수를 올림으로 계산한다", () => {
    expect(totalPages({ size: 25, totalElements: 51 })).toBe(3);
    expect(totalPages({ size: 25, totalElements: 0 })).toBe(0);
  });
});

describe("명세서에서 생성한 계약 스키마", () => {
  it("접근 상태 응답 예시를 통과시킨다", () => {
    const parsed = AuthContextResponseSchema.parse({
      accessCondition: "ACTIVE",
      officeId: 12,
      role: "AGENT",
      pendingRegistrationId: null,
      pendingMembershipId: null,
      unresolvedRejection: null,
      graceUntil: null,
      returnPeriodEndsAt: null,
      restrictionReason: null,
      removalReason: null,
      reconsentRequired: false,
    });
    expect(parsed.role).toBe("AGENT");
  });

  it("접근 상태 8조건 밖의 값과 알 수 없는 역할은 거절한다", () => {
    const base = { reconsentRequired: false };
    expect(
      AuthContextResponseSchema.safeParse({ ...base, accessCondition: "WHATEVER" }).success,
    ).toBe(false);
    expect(
      AuthContextResponseSchema.safeParse({ ...base, accessCondition: "ACTIVE", role: "BOSS" })
        .success,
    ).toBe(false);
  });

  it("세션 응답과 로그인 요청과 재동의 응답과 운영자 응답을 검증한다", () => {
    expect(
      CurrentSessionResponseSchema.safeParse({
        authenticatedAt: "2026-11-10T09:00:00+09:00",
        lastAccessedAt: "2026-11-10T09:00:00+09:00",
        idleExpiresAt: "2026-11-10T21:00:00+09:00",
        absoluteExpiresAt: "2026-11-17T09:00:00+09:00",
        stepUpValid: false,
        stepUpExpiresAt: null,
      }).success,
    ).toBe(true);
    expect(LoginRequestSchema.safeParse({ email: "a@b.c", password: "pw" }).success).toBe(true);
    expect(LoginRequestSchema.safeParse({ email: "a@b.c" }).success).toBe(false);
    expect(
      TermsReconsentResponseSchema.safeParse({ reconsentRequired: false, items: [] }).success,
    ).toBe(true);
    expect(
      OpsMeResponseSchema.safeParse({ operatorId: 1, name: "예시", roles: ["OPS"] }).success,
    ).toBe(true);
  });
});
