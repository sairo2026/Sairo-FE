import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ApiError, ApiNetworkError } from "@/shared/api/api-error";
import {
  BACKEND_ERROR_CODES,
  BACKEND_FIELD_ERROR_CODES,
} from "@/shared/testing/backend-error-codes";
import { describeAuthError, fieldErrorMap, fieldErrorSummary } from "./api-messages";
import {
  ERROR_CODE_COPY,
  FIELD_ERROR_CODE_COPY,
  GENERIC_ERROR_COPY,
  NETWORK_ERROR_COPY,
  describeApiError,
  describeFieldError,
} from "./error-copy";

const SERVER_MESSAGE = "보관 상태가 아닌 매물의 복원 시도";

function apiError(
  status: number,
  code: string,
  extra: {
    retryAfterSeconds?: number;
    fieldErrors?: Array<{ field: string; code?: string; message: string }>;
  } = {},
) {
  return new ApiError(status, { code, message: SERVER_MESSAGE, ...extra });
}

describe("오류 코드 사전", () => {
  it("백엔드 ErrorCode 전체에 문구가 있다", () => {
    const missing = BACKEND_ERROR_CODES.map(([code]) => code).filter(
      (code) => !ERROR_CODE_COPY[code],
    );
    expect(missing).toEqual([]);
  });

  it("백엔드에 없는 코드는 사전에 남기지 않는다", () => {
    const known = new Set(BACKEND_ERROR_CODES.map(([code]) => code));
    expect(Object.keys(ERROR_CODE_COPY).filter((code) => !known.has(code))).toEqual([]);
  });

  it("필드 오류 코드 전체에 문구가 있다", () => {
    expect(BACKEND_FIELD_ERROR_CODES.filter((code) => !FIELD_ERROR_CODE_COPY[code])).toEqual([]);
  });

  it("문구는 존댓말 한두 문장이고 내부 이름이나 개발자용 표현을 쓰지 않는다", () => {
    const copies = [
      ...Object.values(ERROR_CODE_COPY),
      ...Object.values(FIELD_ERROR_CODE_COPY),
      ...Object.values(NETWORK_ERROR_COPY),
      GENERIC_ERROR_COPY,
    ];
    for (const copy of copies) {
      expect(copy, copy).toMatch(/(니다|세요|요)\.$/);
      expect(copy.split(/(?<=\.) /).length, copy).toBeLessThanOrEqual(2);
      expect(copy, copy).not.toMatch(/[A-Z]{2,}_[A-Z_]+/);
      expect(copy, copy).not.toMatch(
        /PENDING|REJECTED|\bAPI\b|\bPG\b|빌링키|step-up|HTTP|traceId/i,
      );
    }
  });
});

describe("describeApiError", () => {
  it("서버 message는 어떤 경로로도 문구에 쓰지 않는다", () => {
    const cases = [
      apiError(409, "PROPERTY_NOT_ARCHIVED"),
      apiError(409, "NOT_IN_DICTIONARY"),
      apiError(400, "INVALID_REQUEST"),
      apiError(429, "RATE_LIMITED", { retryAfterSeconds: 30 }),
      apiError(500, "INTERNAL_ERROR"),
      apiError(503, "UNKNOWN_ERROR"),
    ];
    for (const error of cases) {
      expect(describeApiError(error)).not.toContain(SERVER_MESSAGE);
      expect(describeAuthError(error, "대체 문구입니다.")).not.toContain(SERVER_MESSAGE);
    }
  });

  it("사전에 있는 코드는 사전 문구를 보여준다", () => {
    expect(describeApiError(apiError(409, "PROPERTY_NOT_ARCHIVED"))).toBe(
      ERROR_CODE_COPY.PROPERTY_NOT_ARCHIVED,
    );
    expect(describeApiError(apiError(409, "INVALID_TRANSITION"))).toBe(
      ERROR_CODE_COPY.INVALID_TRANSITION,
    );
  });

  it("사전에 없는 코드는 호출부 대체 문구, 없으면 공통 일반 문구로 바꾼다", () => {
    const error = apiError(409, "NOT_IN_DICTIONARY");
    expect(describeApiError(error)).toBe("요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    expect(describeApiError(error, "저장하지 못했습니다.")).toBe("저장하지 못했습니다.");
    expect(describeApiError(new Error("내부 오류"))).toBe(GENERIC_ERROR_COPY);
  });

  it("호출부가 준 맥락별 문구가 공통 사전보다 먼저다", () => {
    const error = apiError(409, "VERSION_CONFLICT");
    expect(describeApiError(error, "대체", { VERSION_CONFLICT: "맥락 문구입니다." })).toBe(
      "맥락 문구입니다.",
    );
  });

  it("연결 오류는 종류별로 다른 문구를 준다", () => {
    const kinds = ["timeout", "offline", "network", "aborted"] as const;
    const texts = kinds.map((kind) => describeApiError(new ApiNetworkError(kind)));
    expect(new Set(texts).size).toBe(4);
    expect(describeApiError(new ApiNetworkError("timeout"))).toContain("이미 처리되었을 수 있으니");
  });

  it("요청 제한은 대기 시간이 있으면 알려 주고, 5xx는 일시 오류 문구를 준다", () => {
    expect(describeApiError(apiError(429, "RATE_LIMITED", { retryAfterSeconds: 90 }))).toBe(
      "요청이 너무 많습니다. 1분 30초 뒤에 다시 시도해 주세요.",
    );
    expect(describeApiError(apiError(429, "RATE_LIMITED"))).toBe(
      "요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.",
    );
    expect(describeApiError(apiError(429, "NOT_IN_DICTIONARY"))).toContain("요청이 너무 많습니다.");
    expect(describeApiError(apiError(500, "NOT_IN_DICTIONARY"))).toBe(
      "일시적인 오류가 발생했습니다. 잠시 뒤에 다시 시도해 주세요.",
    );
    expect(describeApiError(apiError(429, "MFA_LOCKED"))).toBe(ERROR_CODE_COPY.MFA_LOCKED);
    expect(describeApiError(apiError(503, "PAYMENT_SYSTEM_UNAVAILABLE"))).toBe(
      ERROR_CODE_COPY.PAYMENT_SYSTEM_UNAVAILABLE,
    );
  });

  it("계정 존재 여부를 더 드러내지 않는다", () => {
    expect(describeApiError(apiError(401, "INVALID_CREDENTIALS"))).toBe(
      "이메일 또는 비밀번호가 맞지 않습니다.",
    );
  });
});

describe("필드 오류 문구", () => {
  it("항목과 코드로 문구를 고르고 서버 문장은 쓰지 않는다", () => {
    const error = apiError(400, "INVALID_REQUEST", {
      fieldErrors: [
        { field: "title", code: "REQUIRED", message: SERVER_MESSAGE },
        { field: "size", code: "OUT_OF_RANGE", message: SERVER_MESSAGE },
        { field: "email", code: "INVALID_FORMAT", message: SERVER_MESSAGE },
        { field: "memo", message: SERVER_MESSAGE },
        { field: "other", code: "NOT_A_FIELD_CODE", message: SERVER_MESSAGE },
      ],
    });
    expect(fieldErrorMap(error)).toEqual({
      title: FIELD_ERROR_CODE_COPY.REQUIRED,
      size: FIELD_ERROR_CODE_COPY.OUT_OF_RANGE,
      email: FIELD_ERROR_CODE_COPY.INVALID_FORMAT,
      memo: "입력한 내용을 확인해 주세요.",
      other: "입력한 내용을 확인해 주세요.",
    });
    expect(fieldErrorSummary(error)).not.toContain(SERVER_MESSAGE);
  });

  it("비밀번호 항목은 기준을 알려 주는 문구를 쓴다", () => {
    expect(describeFieldError({ field: "password", code: "TOO_SHORT" })).toBe(
      "비밀번호는 8자 이상이어야 합니다.",
    );
    expect(describeFieldError({ field: "newPassword", code: "TOO_LONG" })).toBe(
      "비밀번호는 12자 이하여야 합니다.",
    );
  });
});

describe("서버 message 사용 금지", () => {
  const ROOT = path.resolve(__dirname, "../..");
  const SKIP = /(\.test\.|[\\/]mocks[\\/]|[\\/]testing[\\/]|[\\/]api[\\/]|[\\/]contracts[\\/])/;
  const LEAK = /\b(?:error|caught|err|cause|apiError)\??\.message\b/;

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return sources(full);
      return /\.tsx?$/.test(name) && !SKIP.test(full) ? [full] : [];
    });
  }

  it("화면 코드는 오류 객체의 message를 읽지 않는다", () => {
    const offenders = sources(ROOT)
      .filter((file) => LEAK.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});
