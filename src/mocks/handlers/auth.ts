import { http, HttpResponse } from "msw";
import { recordMockAgreement } from "./settings";
import type { AuthContextResponse } from "@/lib/api/contracts/common.schema";
import { errorResponse, mockErrors } from "../error-responses";

export const MOCK_ACTIVE_CONTEXT: AuthContextResponse = {
  accessCondition: "ACTIVE",
  officeId: 12,
  role: "AGENT",
  pendingRegistrationId: null,
  pendingMembershipId: null,
  unresolvedRejection: null,
  graceUntil: null,
  returnPeriodEndsAt: null,
  restrictionReason: null,
  removalReason: null,
  reconsentRequired: false,
};

type MockAuthState = {
  context: AuthContextResponse | null;
  failedLogins: number;
};

const state: MockAuthState = { context: MOCK_ACTIVE_CONTEXT, failedLogins: 0 };

/** 모의 로그인 상태를 바꾼다. null이면 로그인하지 않은 상태다. */
export function setMockAuthContext(context: AuthContextResponse | null): void {
  state.context = context;
}

export function getMockAuthContext(): AuthContextResponse | null {
  return state.context;
}

export function resetMockAuthState(): void {
  state.context = MOCK_ACTIVE_CONTEXT;
  state.failedLogins = 0;
}

const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_LOCK_SECONDS = 900;
const NOW = "2026-11-10T09:00:00+09:00";

function toLoginResponse(context: AuthContextResponse) {
  return {
    accessCondition: context.accessCondition,
    officeId: context.officeId ?? null,
    role: context.role ?? null,
    pendingRegistrationId: context.pendingRegistrationId ?? null,
    pendingMembershipId: context.pendingMembershipId ?? null,
    unresolvedRejection: context.unresolvedRejection ?? null,
    graceUntil: context.graceUntil ?? null,
    returnPeriodEndsAt: context.returnPeriodEndsAt ?? null,
    restrictionReason: context.restrictionReason ?? null,
    removalReason: context.removalReason ?? null,
  };
}

export const authHandlers = [
  http.get("/api/auth/context", () => {
    if (!state.context) return mockErrors.unauthenticated();
    return HttpResponse.json(state.context);
  }),

  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (state.failedLogins >= LOGIN_FAILURE_LIMIT) {
      return mockErrors.loginLocked(LOGIN_LOCK_SECONDS);
    }
    if (body.email === "agent@example.com" && body.password === "mock-password-1") {
      state.failedLogins = 0;
      state.context = MOCK_ACTIVE_CONTEXT;
      return HttpResponse.json(toLoginResponse(MOCK_ACTIVE_CONTEXT));
    }
    state.failedLogins += 1;
    return mockErrors.invalidCredentials();
  }),

  http.post("/api/auth/logout", () => {
    state.context = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/me/session", () => {
    if (!state.context) return mockErrors.unauthenticated();
    return HttpResponse.json({
      authenticatedAt: NOW,
      lastAccessedAt: NOW,
      idleExpiresAt: "2026-11-10T21:00:00+09:00",
      absoluteExpiresAt: "2026-11-17T09:00:00+09:00",
      stepUpValid: false,
      stepUpExpiresAt: null,
    });
  }),

  http.post("/api/auth/step-up/password", async ({ request }) => {
    if (!state.context) return mockErrors.unauthenticated();
    const body = (await request.json()) as { password?: string };
    if (body.password !== "mock-password-1") return mockErrors.invalidCredentials();
    return HttpResponse.json({ stepUpValid: true, stepUpExpiresAt: "2026-11-10T09:10:00+09:00" });
  }),

  http.get("/api/auth/step-up/kakao/callback", ({ request }) => {
    if (!state.context) return mockErrors.unauthenticated();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code || !url.searchParams.get("state") || code === "expired-code") {
      return mockErrors.validation([]);
    }
    if (code === "other-account-code") {
      return errorResponse(
        403,
        "STEP_UP_ACCOUNT_MISMATCH",
        "로그인한 계정과 다른 카카오 계정입니다.",
      );
    }
    return HttpResponse.json({ stepUpValid: true, stepUpExpiresAt: "2026-11-10T09:10:00+09:00" });
  }),

  http.get("/api/me/terms-reconsent", () => {
    if (!state.context) return mockErrors.unauthenticated();
    return HttpResponse.json({
      reconsentRequired: state.context.reconsentRequired,
      items: state.context.reconsentRequired
        ? [
            {
              termsCode: "TOS",
              previousVersion: "1.0",
              version: "1.1",
              category: "TERMS",
              required: true,
              effectiveAt: "2026-12-01T04:00:00+09:00",
              changeSummary: "자동결제 안내 문구가 추가되었습니다",
              documentUrl: "/legal/terms",
              previousDocumentUrl: "/legal/terms",
            },
          ]
        : [],
    });
  }),

  http.post("/api/me/terms-agreements", async ({ request }) => {
    const rejected = recordMockAgreement(await request.json());
    if (rejected) return rejected;
    if (state.context) state.context = { ...state.context, reconsentRequired: false };
    return new HttpResponse(null, { status: 204 });
  }),
];
