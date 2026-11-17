/** BE의 이메일 로그인 실패 제한(5회 실패 시 15분 잠금)과 같은 값이다. */
export const LOGIN_FAILURE_LIMIT = 5;
export const LOGIN_LOCK_MINUTES = 15;

export function loginLockNotice(limit: number, lockMinutes: number): string {
  return `${limit}회 불일치 시 ${lockMinutes}분 뒤 다시 시도할 수 있습니다.`;
}

export const LOGIN_LOCK_NOTICE = loginLockNotice(LOGIN_FAILURE_LIMIT, LOGIN_LOCK_MINUTES);

/** 이메일 또는 비밀번호가 맞지 않을 때 첫 줄에 보이는 문구다. 가입 여부를 드러내지 않는다. */
export const LOGIN_MISMATCH_LEAD = "이메일 또는 비밀번호가 맞지 않습니다.";

/** 서버가 횟수를 내려주지 않을 때(이전 서버) 쓰는 한 줄 문구다. */
export const LOGIN_MISMATCH_COPY = `${LOGIN_MISMATCH_LEAD} ${LOGIN_LOCK_NOTICE}`;

export const LOGIN_LOCKED_LEAD = `로그인에 ${LOGIN_FAILURE_LIMIT}회 실패해 잠시 막았습니다.`;

export type LoginMismatchView = {
  lead: string;
  /** 예: "연속 2회 실패 · 남은 시도 3회" */
  count: string;
  notice: string;
  /** 남은 횟수가 적을수록 강조를 높인다. 1~2회는 critical, 그보다 많으면 normal이다. */
  tone: "normal" | "critical";
};

type LoginMismatchDetails = {
  failedAttempts?: number;
  remainingAttempts?: number;
  maxAttempts?: number;
  lockMinutes?: number;
};

/** 서버의 횟수 필드로 불일치 안내를 만든다. 필수 필드가 없으면 null이라 한 줄 문구로 대체한다. */
export function describeLoginMismatch(details: LoginMismatchDetails): LoginMismatchView | null {
  const { failedAttempts, remainingAttempts } = details;
  if (!Number.isInteger(failedAttempts) || !Number.isInteger(remainingAttempts)) return null;
  const limit = details.maxAttempts ?? LOGIN_FAILURE_LIMIT;
  const minutes = details.lockMinutes ?? LOGIN_LOCK_MINUTES;
  return {
    lead: LOGIN_MISMATCH_LEAD,
    count: `연속 ${failedAttempts}회 실패 · 남은 시도 ${remainingAttempts}회`,
    notice: loginLockNotice(limit, minutes),
    tone: (remainingAttempts as number) <= 2 ? "critical" : "normal",
  };
}
