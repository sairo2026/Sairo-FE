import { ApiError } from "@/shared/api/client";
import {
  FIELD_ERROR_FALLBACK_COPY,
  describeApiError,
  describeFieldError,
  formatWait,
} from "./error-copy";

export { formatWait };

const MESSAGE_BY_CODE: Record<string, string> = {
  INVALID_CREDENTIALS: "이메일 또는 비밀번호가 맞지 않습니다.",
  EMAIL_ALREADY_REGISTERED: "이미 가입된 이메일입니다.",
  PHONE_ALREADY_REGISTERED: "이미 가입된 휴대폰 번호입니다.",
  KAKAO_ALREADY_LINKED: "이미 다른 계정에 연결된 카카오 계정입니다.",
  LAST_LOGIN_METHOD: "마지막 남은 로그인 방식은 해제할 수 없습니다.",
  TOKEN_EXPIRED: "인증 시간이 지났습니다. 다시 인증해 주세요.",
  TOKEN_INVALID: "인증 정보가 올바르지 않습니다. 다시 인증해 주세요.",
  VERIFICATION_CODE_INVALID: "인증번호가 맞지 않습니다.",
  MARKETING_EMAIL_REQUIRED: "마케팅 수신 동의에는 인증된 이메일이 필요합니다.",
  STEP_UP_ACCOUNT_MISMATCH: "현재 로그인한 계정과 다른 카카오 계정입니다.",
};

export function describeAuthError(error: unknown, fallback: string): string {
  return describeApiError(error, fallback, MESSAGE_BY_CODE);
}

export function isApiCode(error: unknown, code: string): error is ApiError {
  return error instanceof ApiError && error.code === code;
}

export function fieldErrorMap(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.fieldErrors) return {};
  const result: Record<string, string> = {};
  for (const item of error.fieldErrors) {
    if (item.field && !(item.field in result)) result[item.field] = describeFieldError(item);
  }
  return result;
}

/** 400 응답의 필드 오류 문구를 중복 없이 한 문장으로 합친다. 구체적인 문구가 없으면 undefined다. */
export function fieldErrorSummary(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.status !== 400 || !error.fieldErrors?.length) {
    return undefined;
  }
  const specific = new Set(
    error.fieldErrors
      .map((item) => describeFieldError(item))
      .filter((copy) => copy !== FIELD_ERROR_FALLBACK_COPY),
  );
  return specific.size > 0 ? [...specific].join(" ") : undefined;
}

export function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}
