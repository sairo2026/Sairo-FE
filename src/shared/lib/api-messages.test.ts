import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/client";
import { fieldErrorMap, fieldErrorSummary } from "./api-messages";

type Item = { field: string; code?: string; message: string };

function apiError(status: number, fieldErrors?: Item[]) {
  return new ApiError(status, { code: "INVALID_REQUEST", message: "입력 오류", fieldErrors });
}

describe("fieldErrorSummary", () => {
  it("400 응답의 필드 오류를 코드별 문구로 바꿔 중복 없이 한 문장으로 합친다", () => {
    const error = apiError(400, [
      { field: "title", code: "REQUIRED", message: "서버 문장 1" },
      { field: "dueDate", code: "OUT_OF_RANGE", message: "서버 문장 2" },
      { field: "memo", code: "REQUIRED", message: "서버 문장 3" },
    ]);
    expect(fieldErrorSummary(error)).toBe(
      "필수 입력입니다. 허용 범위를 벗어났습니다. 값을 확인해 주세요.",
    );
  });

  it("필드 오류가 없거나 400이 아니면 undefined다", () => {
    expect(fieldErrorSummary(apiError(400, []))).toBeUndefined();
    expect(
      fieldErrorSummary(apiError(409, [{ field: "a", code: "REQUIRED", message: "b" }])),
    ).toBeUndefined();
    expect(fieldErrorSummary(new Error("x"))).toBeUndefined();
  });
});

describe("fieldErrorMap", () => {
  it("필드별 첫 오류만 남기고 서버 문장은 쓰지 않는다", () => {
    const error = apiError(400, [
      { field: "password", code: "TOO_SHORT", message: "첫 문구" },
      { field: "password", code: "TOO_LONG", message: "둘째 문구" },
      { field: "name", code: "INVALID_FORMAT", message: "셋째 문구" },
    ]);
    expect(fieldErrorMap(error)).toEqual({
      password: "비밀번호는 8자 이상이어야 합니다.",
      name: "형식이 올바르지 않습니다. 입력한 내용을 확인해 주세요.",
    });
    expect(fieldErrorMap(new Error("x"))).toEqual({});
  });

  it("코드가 없거나 모르는 코드면 일반 입력 확인 문구를 쓴다", () => {
    const error = apiError(400, [
      { field: "a", message: "서버 문장" },
      { field: "b", code: "UNKNOWN_CODE", message: "서버 문장" },
    ]);
    expect(fieldErrorMap(error)).toEqual({
      a: "입력한 내용을 확인해 주세요.",
      b: "입력한 내용을 확인해 주세요.",
    });
  });
});
