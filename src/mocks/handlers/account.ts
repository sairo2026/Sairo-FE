import { http, HttpResponse } from "msw";
import type { MeResponse, TermsCatalogResponse } from "@/lib/api/contracts/auth.schema";
import { errorResponse, mockErrors } from "../error-responses";

export const MOCK_TERMS_VERSION = "1.0";

export const MOCK_TERMS: TermsCatalogResponse["items"] = [
  {
    termsCode: "TOS",
    version: MOCK_TERMS_VERSION,
    required: true,
    title: "사이로 이용약관",
    documentUrl: "/legal/terms",
    category: "TERMS",
    reconsentRequired: false,
    changeSummary: null,
  },
  {
    termsCode: "PRIVACY",
    version: MOCK_TERMS_VERSION,
    required: false,
    title: "사이로 개인정보처리방침",
    documentUrl: "/legal/privacy",
    category: "NOTICE",
    reconsentRequired: false,
    changeSummary: null,
  },
  {
    termsCode: "MARKETING",
    version: MOCK_TERMS_VERSION,
    required: false,
    title: "이메일 공지·혜택 안내 수신 및 개인정보 수집·이용 동의(선택)",
    documentUrl: "/legal/marketing",
    category: "MARKETING",
    reconsentRequired: false,
    changeSummary: null,
  },
];

export const MOCK_ME: MeResponse = {
  userId: 7,
  displayName: "카카오 사용자",
  email: "agent@example.com",
  emailVerified: true,
  phone: "010-1234-5678",
  phoneVerified: true,
  kakaoLinked: false,
  loginMethods: ["EMAIL"],
  accountStatus: "ACTIVE",
  notificationPreferences: {
    channels: { VISIT_REMINDER: true, MARKETING: false, SECURITY: true },
    mandatoryTypes: [],
  },
  createdAt: "2026-11-01T09:00:00+09:00",
  termsAgreements: [],
};

type AccountState = {
  termsVersion: string;
  me: MeResponse;
  unsubscribed: boolean;
  emailLinkCount: number;
};

const state: AccountState = {
  termsVersion: MOCK_TERMS_VERSION,
  me: MOCK_ME,
  unsubscribed: false,
  emailLinkCount: 0,
};

export function setMockTermsVersion(version: string): void {
  state.termsVersion = version;
}

export function setMockMe(me: MeResponse): void {
  state.me = me;
}

export function resetMockAccountState(): void {
  state.termsVersion = MOCK_TERMS_VERSION;
  state.me = MOCK_ME;
  state.unsubscribed = false;
  state.emailLinkCount = 0;
}

const NEW_ACCOUNT_CONTEXT = {
  accessCondition: "PRE_VERIFICATION",
  officeId: null,
  role: null,
  pendingRegistrationId: null,
  pendingMembershipId: null,
  unresolvedRejection: null,
  graceUntil: null,
  returnPeriodEndsAt: null,
  restrictionReason: null,
  removalReason: null,
};

const NOW = "2026-11-10T09:00:00+09:00";

function currentTerms() {
  return MOCK_TERMS.map((item) => ({ ...item, version: state.termsVersion }));
}

type AgreedTerm = { termsCode: string; version: string };

function findStaleTerms(agreed: AgreedTerm[] | undefined) {
  return (agreed ?? [])
    .filter((item) => item.version !== state.termsVersion)
    .map((item) => ({
      termsCode: item.termsCode,
      submittedVersion: item.version,
      currentVersion: state.termsVersion,
      changeSummary: "자동결제 안내 문구가 추가되었습니다",
      documentUrl:
        MOCK_TERMS.find((term) => term.termsCode === item.termsCode)?.documentUrl ?? "/legal",
    }));
}

function unprocessable(code: string, message: string) {
  return errorResponse(422, code, message);
}

export const accountHandlers = [
  http.get("/api/terms", () => HttpResponse.json({ items: currentTerms() })),

  http.post("/api/auth/signup/email/verification", async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    if (body.email === "registered@example.com") {
      return errorResponse(409, "EMAIL_ALREADY_REGISTERED", "이미 가입된 이메일입니다.");
    }
    if (body.email === "limited@example.com") return mockErrors.rateLimited(120);
    return HttpResponse.json({ accepted: true, resendAfterSeconds: 60 }, { status: 202 });
  }),

  http.post("/api/auth/signup/email/verify", async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (body.token === "expired-token-000000") {
      return unprocessable("TOKEN_EXPIRED", "인증 링크가 만료되었습니다.");
    }
    if (body.token === "used-token-0000000000") {
      return unprocessable("TOKEN_INVALID", "이미 사용한 링크입니다.");
    }
    return HttpResponse.json({ verifiedEmailTicket: "email-ticket-verified" });
  }),

  http.post("/api/auth/phone-verification", async ({ request }) => {
    const body = (await request.json()) as { phone?: string };
    if (body.phone === "010-9999-9999") return mockErrors.rateLimited(30);
    return HttpResponse.json({ accepted: true, resendAfterSeconds: 60 }, { status: 202 });
  }),

  http.post("/api/auth/phone-verification/verify", async ({ request }) => {
    const body = (await request.json()) as { phone?: string; code?: string };
    if (body.code === "000000") {
      return unprocessable("VERIFICATION_CODE_INVALID", "인증번호가 맞지 않습니다.");
    }
    if (body.code === "999999") return unprocessable("TOKEN_EXPIRED", "인증 시간이 지났습니다.");
    if (body.code === "111111") return unprocessable("TOKEN_INVALID", "인증번호가 폐기되었습니다.");
    return HttpResponse.json({
      verifiedPhoneTicket: `phone-ticket:${body.phone ?? ""}`,
      expiresAt: "2026-11-10T09:10:00+09:00",
    });
  }),

  http.post("/api/auth/signup/email", async ({ request }) => {
    const body = (await request.json()) as {
      verifiedEmailTicket?: string;
      verifiedPhoneTicket?: string;
      password?: string;
      displayName?: string;
      agreedTerms?: AgreedTerm[];
    };
    if (body.verifiedPhoneTicket === "phone-ticket:010-1111-1111") {
      return errorResponse(409, "PHONE_ALREADY_REGISTERED", "이미 가입된 휴대폰 번호입니다.");
    }
    const stale = findStaleTerms(body.agreedTerms);
    if (stale.length > 0) {
      return errorResponse(409, "TERMS_VERSION_CHANGED", "약관이 바뀌었습니다.", {
        changedItems: stale,
      });
    }
    if (body.password === "weakpass1") {
      return mockErrors.validation([
        { field: "password", code: "INVALID_VALUE", message: "너무 흔한 비밀번호입니다." },
      ]);
    }
    return HttpResponse.json(NEW_ACCOUNT_CONTEXT, { status: 201 });
  }),

  http.post("/api/auth/signup/kakao", async ({ request }) => {
    const body = (await request.json()) as {
      verifiedPhoneTicket?: string;
      agreedTerms?: AgreedTerm[];
    };
    if (body.verifiedPhoneTicket === "phone-ticket:010-1111-1111") {
      return errorResponse(409, "PHONE_ALREADY_REGISTERED", "이미 가입된 휴대폰 번호입니다.");
    }
    const stale = findStaleTerms(body.agreedTerms);
    if (stale.length > 0) {
      return errorResponse(409, "TERMS_VERSION_CHANGED", "약관이 바뀌었습니다.", {
        changedItems: stale,
      });
    }
    return HttpResponse.json(NEW_ACCOUNT_CONTEXT, { status: 201 });
  }),

  http.get("/api/auth/recovery-options", ({ request }) => {
    const url = new URL(request.url);
    const hasPhone = url.searchParams.has("verifiedPhoneTicket");
    return HttpResponse.json({
      existingAccountFound: true,
      availableLoginMethods: hasPhone ? ["EMAIL", "KAKAO"] : ["EMAIL"],
      passwordResetAvailable: true,
    });
  }),

  http.post("/api/auth/password/reset-request", () =>
    HttpResponse.json({ accepted: true }, { status: 202 }),
  ),

  http.post("/api/auth/password/reset", async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (body.token === "expired-token-000000") {
      return unprocessable("TOKEN_EXPIRED", "링크가 만료되었습니다.");
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/public/marketing-unsubscribe", async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (body.token === "invalid-token-000000") {
      return mockErrors.validation([
        { field: "token", code: "INVALID_VALUE", message: "수신 거부 링크가 올바르지 않습니다." },
      ]);
    }
    const status =
      state.unsubscribed || body.token === "already-token-000000"
        ? "ALREADY_UNSUBSCRIBED"
        : "UNSUBSCRIBED";
    state.unsubscribed = true;
    return HttpResponse.json({
      status,
      expressedAt: NOW,
      processedAt: NOW,
      resultNoticeDueAt: "2026-11-24T09:00:00+09:00",
      emailNoticeScheduled: true,
    });
  }),

  http.get("/api/me", () => HttpResponse.json(state.me)),

  http.post("/api/me/login-methods/email/verification", () => {
    state.emailLinkCount += 1;
    return HttpResponse.json({ accepted: true, resendAfterSeconds: 60 }, { status: 202 });
  }),

  http.post("/api/me/login-methods/email/verify", async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (body.token === "expired-token-000000") {
      return unprocessable("TOKEN_EXPIRED", "인증 링크가 만료되었습니다.");
    }
    return HttpResponse.json({ verifiedEmailTicket: "link-ticket-verified" });
  }),

  http.post("/api/me/login-methods/email", () =>
    HttpResponse.json({ method: "EMAIL", linked: true }, { status: 201 }),
  ),

  http.post("/api/me/login-methods/kakao", async ({ request }) => {
    const body = (await request.json()) as { code?: string };
    if (body.code === "taken-code") {
      return errorResponse(409, "KAKAO_ALREADY_LINKED", "이미 다른 계정에 연결되었습니다.");
    }
    return HttpResponse.json({ method: "KAKAO", linked: true }, { status: 201 });
  }),

  http.delete("/api/me/login-methods/:method", ({ params }) => {
    if (state.me.loginMethods.length <= 1) {
      return errorResponse(409, "LAST_LOGIN_METHOD", "마지막 로그인 방식입니다.");
    }
    const target = String(params.method).toUpperCase();
    state.me = { ...state.me, loginMethods: state.me.loginMethods.filter((m) => m !== target) };
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/me/contact/email/verification", () =>
    HttpResponse.json({ accepted: true, resendAfterSeconds: 60 }, { status: 202 }),
  ),

  http.post("/api/me/contact/email/verify", async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (body.token === "expired-token-000000") {
      return unprocessable("TOKEN_EXPIRED", "인증 링크가 만료되었습니다.");
    }
    return HttpResponse.json({ verifiedEmailTicket: "contact-ticket-verified" });
  }),

  http.patch("/api/me/contact", async ({ request }) => {
    const body = (await request.json()) as { email?: string; phone?: string };
    const field = body.email ? "email" : "phone";
    return HttpResponse.json({ field, value: body.email ?? body.phone ?? "", verifiedAt: NOW });
  }),
];
