import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import { OPS_ROLES } from "@/features/ops/model/roles";
import type { OpsRole } from "@/features/ops/model/roles";
import { errorResponse, mockErrors } from "../error-responses";

export type MockOperator = { operatorId: number; name: string; roles: string[] };

export const MOCK_OPERATOR: MockOperator = {
  operatorId: 1,
  name: "운영 김사이",
  roles: [...OPS_ROLES],
};

export const MOCK_OTP_CODE = "123456";
const MFA_FAILURE_LIMIT = 5;
const MFA_LOCK_SECONDS = 900;
const STEP_UP_VALID_MS = 5 * 60 * 1000;

type MockOpsSessionState = {
  operator: MockOperator | null;
  failedMfa: number;
  stepUpUntil: number | null;
};

const state: MockOpsSessionState = {
  operator: MOCK_OPERATOR,
  failedMfa: 0,
  stepUpUntil: null,
};

/** 모의 운영자 로그인 상태를 바꾼다. null이면 로그인하지 않은 상태다. */
export function setMockOperator(operator: MockOperator | null): void {
  state.operator = operator;
  state.stepUpUntil = null;
}

export function setMockOperatorRoles(roles: readonly OpsRole[]): void {
  state.operator = { ...MOCK_OPERATOR, roles: [...roles] };
}

export function getMockOperator(): MockOperator | null {
  return state.operator;
}

/** 5분 이내 재인증을 마친 것으로 만든다. 재인증이 필요한 처리를 시험할 때 쓴다. */
export function markMockStepUp(): void {
  state.stepUpUntil = Date.now() + STEP_UP_VALID_MS;
}

export function resetMockOpsSession(): void {
  state.operator = MOCK_OPERATOR;
  state.failedMfa = 0;
  state.stepUpUntil = null;
}

/** 운영자 세션과 역할을 검사한다. 통과하면 null, 아니면 오류 응답을 돌려준다. */
export function requireMockOps(roles: readonly OpsRole[] = []): Response | null {
  if (state.operator === null) return mockErrors.unauthenticated();
  if (roles.length > 0 && !roles.some((role) => state.operator?.roles.includes(role))) {
    return mockErrors.forbidden();
  }
  return null;
}

/** 5분 이내 재인증이 필요한 처리를 검사한다. */
export function requireMockStepUp(): Response | null {
  if (state.stepUpUntil === null || state.stepUpUntil < Date.now()) {
    return mockErrors.stepUpRequired();
  }
  return null;
}

function mfaBlocked(): Response | null {
  if (state.failedMfa >= MFA_FAILURE_LIMIT) {
    return errorResponse(
      429,
      "MFA_LOCKED",
      "확인 코드를 여러 번 틀려 잠겼습니다.",
      { retryAfterSeconds: MFA_LOCK_SECONDS },
      { "Retry-After": String(MFA_LOCK_SECONDS) },
    );
  }
  return null;
}

async function readOtp(request: Request): Promise<string | null> {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body === "object" && body !== null && "otpCode" in body) {
    const value = body.otpCode;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function checkOtp(code: string | null): Response | null {
  const locked = mfaBlocked();
  if (locked) return locked;
  if (code === null || !/^\d{6}$/.test(code)) {
    return mockErrors.validation([{ field: "otpCode", message: "6자리 숫자를 입력해 주세요." }]);
  }
  if (code !== MOCK_OTP_CODE) {
    state.failedMfa += 1;
    return errorResponse(401, "MFA_CODE_INVALID", "확인 코드가 맞지 않습니다.");
  }
  state.failedMfa = 0;
  return null;
}

export const opsSessionHandlers: RequestHandler[] = [
  http.get("/api/ops/me", () => {
    const rejected = requireMockOps();
    if (rejected) return rejected;
    return HttpResponse.json(state.operator);
  }),

  http.post("/api/ops/auth/mfa/verify", async ({ request }) => {
    const rejected = checkOtp(await readOtp(request));
    if (rejected) return rejected;
    state.operator = state.operator ?? MOCK_OPERATOR;
    return HttpResponse.json({
      ...state.operator,
      idleExpiresAt: "2026-11-10T09:30:00+09:00",
      absoluteExpiresAt: "2026-11-10T17:00:00+09:00",
    });
  }),

  http.post("/api/ops/auth/step-up", async ({ request }) => {
    const unauthenticated = requireMockOps();
    if (unauthenticated) return unauthenticated;
    const rejected = checkOtp(await readOtp(request));
    if (rejected) return rejected;
    markMockStepUp();
    return HttpResponse.json({
      stepUpValidUntil: new Date(Date.now() + STEP_UP_VALID_MS).toISOString(),
    });
  }),

  http.post("/api/ops/auth/logout", () => {
    state.operator = null;
    state.stepUpUntil = null;
    return new HttpResponse(null, { status: 204 });
  }),
];
