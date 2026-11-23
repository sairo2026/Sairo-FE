import { describe, expect, it } from "vitest";
import { ApiError, ApiNetworkError } from "./api-error";
import { isTransientGatewayError } from "./error-kind";
import { shouldRetryTransient, transientRetryDelay } from "./query-client";

const apiError = (status: number) => new ApiError(status, { code: "X", message: "m" });

describe("isTransientGatewayError", () => {
  it.each([502, 503, 504])("%s는 일시적인 오류로 본다", (status) => {
    expect(isTransientGatewayError(apiError(status))).toBe(true);
  });

  it.each([400, 401, 403, 404, 409, 429, 500])("%s는 일시적인 오류로 보지 않는다", (status) => {
    expect(isTransientGatewayError(apiError(status))).toBe(false);
  });

  it("네트워크 실패와 시간 초과는 일시적이고 사용자의 취소는 아니다", () => {
    expect(isTransientGatewayError(new ApiNetworkError("network"))).toBe(true);
    expect(isTransientGatewayError(new ApiNetworkError("timeout"))).toBe(true);
    expect(isTransientGatewayError(new ApiNetworkError("offline"))).toBe(true);
    expect(isTransientGatewayError(new ApiNetworkError("aborted"))).toBe(false);
    expect(isTransientGatewayError(new Error("boom"))).toBe(false);
  });
});

describe("transient retry policy", () => {
  it("일시적인 오류만 제한된 횟수 안에서 다시 시도한다", () => {
    expect(shouldRetryTransient(0, apiError(502))).toBe(true);
    expect(shouldRetryTransient(8, apiError(502))).toBe(true);
    expect(shouldRetryTransient(9, apiError(502))).toBe(false);
    expect(shouldRetryTransient(0, apiError(401))).toBe(false);
    expect(shouldRetryTransient(0, apiError(500))).toBe(false);
  });

  it("대기 시간 합계는 약 90초를 넘지 않고 무작위로 흩어진다", () => {
    let maxTotal = 0;
    let minTotal = 0;
    for (let count = 0; count < 9; count += 1) {
      maxTotal += transientRetryDelay(count, () => 1);
      minTotal += transientRetryDelay(count, () => 0);
    }
    expect(maxTotal).toBe(90_000);
    expect(minTotal).toBeGreaterThan(60_000);
    expect(transientRetryDelay(0, () => 0)).toBeLessThan(transientRetryDelay(0, () => 1));
  });
});
