import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/client";
import { fieldErrorMap, fieldErrorSummary } from "./api-messages";

function apiError(status: number, fieldErrors?: Array<{ field: string; message: string }>) {
  return new ApiError(status, { code: "INVALID_REQUEST", message: "입력 오류", fieldErrors });
}

describe("fieldErrorSummary", () => {
  it("400 응답의 필드 오류 문구를 한 문장으로 합친다", () => {
    const error = apiError(400, [
      { field: "title", message: "제목을 입력해 주세요." },
      { field: "dueDate", message: "예정일은 오늘 이후여야 합니다." },
    ]);
    expect(fieldErrorSummary(error)).toBe("제목을 입력해 주세요. 예정일은 오늘 이후여야 합니다.");
  });

  it("필드 오류가 없거나 400이 아니면 undefined다", () => {
    expect(fieldErrorSummary(apiError(400, []))).toBeUndefined();
    expect(fieldErrorSummary(apiError(409, [{ field: "a", message: "b" }]))).toBeUndefined();
    expect(fieldErrorSummary(new Error("x"))).toBeUndefined();
  });
});

describe("fieldErrorMap", () => {
  it("필드별 첫 문구만 남긴다", () => {
    const error = apiError(400, [
      { field: "password", message: "첫 문구" },
      { field: "password", message: "둘째 문구" },
    ]);
    expect(fieldErrorMap(error)).toEqual({ password: "첫 문구" });
    expect(fieldErrorMap(new Error("x"))).toEqual({});
  });
});
