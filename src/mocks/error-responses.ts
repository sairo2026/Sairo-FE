import { HttpResponse } from "msw";
import type { ApiErrorBody } from "@/lib/api/contracts/errors";

type ErrorExtras = Partial<Omit<ApiErrorBody, "code" | "message">>;

const TRACE_ID = "mock-trace-0001";

/** API 명세서 1장의 오류 응답 형식으로 모의 응답을 만든다. */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  extras: ErrorExtras = {},
  headers: Record<string, string> = {},
) {
  const body: ApiErrorBody = { code, message, traceId: TRACE_ID, ...extras };
  return HttpResponse.json(body, { status, headers });
}

export const mockErrors = {
  unauthenticated: () => errorResponse(401, "UNAUTHENTICATED", "로그인이 필요합니다."),
  invalidCredentials: () =>
    errorResponse(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 맞지 않습니다."),
  stepUpRequired: () => errorResponse(401, "STEP_UP_REQUIRED", "본인 확인이 필요합니다."),
  forbidden: () => errorResponse(403, "FORBIDDEN", "권한이 없습니다."),
  reconsentRequired: () =>
    errorResponse(403, "RECONSENT_REQUIRED", "약관 재동의가 필요합니다.", {
      actionUrl: "/reconsent",
    }),
  notFound: () => errorResponse(404, "RESOURCE_NOT_FOUND", "대상을 찾을 수 없습니다."),
  versionConflict: (currentVersion: number) =>
    errorResponse(409, "VERSION_CONFLICT", "다른 사용자가 먼저 수정했습니다.", { currentVersion }),
  rateLimited: (retryAfterSeconds: number) =>
    errorResponse(429, "RATE_LIMITED", "요청이 너무 많습니다.", { retryAfterSeconds }),
  loginLocked: (retryAfterSeconds: number) =>
    errorResponse(429, "LOGIN_LOCKED", "로그인 시도가 너무 많습니다.", { retryAfterSeconds }),
  validation: (fieldErrors: NonNullable<ApiErrorBody["fieldErrors"]>) =>
    errorResponse(400, "INVALID_REQUEST", "입력값을 확인해 주세요.", { fieldErrors }),
  server: () => errorResponse(500, "INTERNAL_ERROR", "일시적인 오류가 발생했습니다."),
  maintenance: () => errorResponse(503, "SERVICE_UNAVAILABLE", "서비스 점검 중입니다."),
};
