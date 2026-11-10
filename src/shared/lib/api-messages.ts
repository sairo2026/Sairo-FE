import { ApiError, ApiNetworkError } from "@/shared/api/client";

export function formatWait(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest}초`;
  return rest === 0 ? `${minutes}분` : `${minutes}분 ${rest}초`;
}

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
  if (error instanceof ApiNetworkError) {
    return error.kind === "offline"
      ? "인터넷 연결을 확인해 주세요."
      : "서버에 연결하지 못했습니다.";
  }
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return error.retryAfterSeconds
        ? `요청이 너무 많습니다. ${formatWait(error.retryAfterSeconds)} 뒤에 다시 시도해 주세요.`
        : "요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.";
    }
    if (error.status >= 500) return "일시적인 오류가 발생했습니다. 잠시 뒤에 다시 시도해 주세요.";
    return MESSAGE_BY_CODE[error.code] ?? fallback;
  }
  return fallback;
}

export function isApiCode(error: unknown, code: string): error is ApiError {
  return error instanceof ApiError && error.code === code;
}

export function fieldErrorMap(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.fieldErrors) return {};
  const result: Record<string, string> = {};
  for (const item of error.fieldErrors) {
    if (item.field && !(item.field in result)) result[item.field] = item.message;
  }
  return result;
}

export function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}
