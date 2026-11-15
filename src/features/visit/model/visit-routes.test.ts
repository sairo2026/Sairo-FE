import { describe, expect, it } from "vitest";
import { COORDINATION_STATUSES } from "./labels";
import {
  coordinationCreatePath,
  coordinationListPath,
  coordinationRequestsPath,
  parseIdParam,
  parseStatusParam,
} from "./visit-routes";

describe("방문 조율 쿼리 규칙", () => {
  it("상태 쿼리는 조율 상태 9개만 받고 나머지는 무시한다", () => {
    for (const status of COORDINATION_STATUSES) {
      expect(parseStatusParam(status)).toBe(status);
      expect(parseStatusParam([status, "CANCELLED"])).toBe(status);
    }
    expect(parseStatusParam("NOPE")).toBeUndefined();
    expect(parseStatusParam("")).toBeUndefined();
    expect(parseStatusParam(undefined)).toBeUndefined();
  });

  it("번호 쿼리는 1 이상의 정수만 받는다", () => {
    expect(parseIdParam("12")).toBe(12);
    expect(parseIdParam(["7", "8"])).toBe(7);
    for (const bad of ["0", "-1", "1.5", "abc", "", "1e3", undefined]) {
      expect(parseIdParam(bad), String(bad)).toBeUndefined();
    }
  });

  it("주소 생성 함수가 규칙대로 쿼리를 만든다", () => {
    expect(coordinationListPath()).toBe("/coordinations");
    expect(coordinationListPath("APPLYING")).toBe("/coordinations?status=APPLYING");
    expect(coordinationCreatePath()).toBe("/coordinations/new");
    expect(coordinationCreatePath({ propertyId: 5 })).toBe("/coordinations/new?propertyId=5");
    expect(coordinationCreatePath({ propertyId: 5, customerId: 9 })).toBe(
      "/coordinations/new?propertyId=5&customerId=9",
    );
    expect(coordinationRequestsPath(801)).toBe("/coordinations/801/requests");
    expect(coordinationRequestsPath(801, "REVALIDATION_FAILED")).toBe(
      "/coordinations/801/requests?status=REVALIDATION_FAILED",
    );
  });
});
