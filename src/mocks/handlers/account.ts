import { http, HttpResponse } from "msw";
import type {
  MeResponse,
  TermsCatalogResponse,
  WithdrawalPreviewResponse,
} from "@/lib/api/contracts/auth.schema";
import { errorResponse, mockErrors } from "../error-responses";
import { MOCK_ACTIVE_CONTEXT, setMockAuthContext } from "./auth";

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

export const MOCK_WITHDRAWAL_PREVIEW: WithdrawalPreviewResponse = {
  isOwner: false,
  isLastOwner: false,
  kakaoLinked: false,
  destroyedItems: ["이메일", "휴대폰 번호", "표시 이름", "카카오 연결 정보", "알림 설정"],
  retainedItems: [
    {
      itemCode: "ACCESS_LOG",
      itemName: "로그인과 접속 기록",
      reason: "계정 보안 사고와 부정 이용의 확인",
      reviewTargetLaws: ["개인정보 보호법", "통신비밀보호법"],
      retentionDays: 365,
      anchorEvent: "RECORDED_AT",
      ruleStatus: "CONFIRMED",
    },
    {
      itemCode: "TERMS_AGREEMENT",
      itemName: "약관 동의와 철회 이력",
      reason: "동의 사실의 확인과 분쟁 대응",
      reviewTargetLaws: ["개인정보 보호법", "전자상거래법"],
      retentionDays: 1095,
      anchorEvent: "WITHDRAWN_AT",
      ruleStatus: "CONFIRMED",
    },
    {
      itemCode: "MARKETING_NOTICE_DELIVERY",
      itemName: "수신 설정 처리 결과 통지와 재확인 발송 이력",
      reason: "광고성 정보 수신 설정의 처리 사실 확인",
      reviewTargetLaws: ["정보통신망법"],
      retentionDays: 1095,
      anchorEvent: "RECORDED_AT",
      ruleStatus: "CONFIRMED",
    },
    {
      itemCode: "BILLING_RECORD",
      itemName: "구독, 결제, 청구 기록",
      reason: "대금 결제와 재화 공급에 관한 기록 보존",
      reviewTargetLaws: ["전자상거래법", "국세기본법"],
      retentionDays: 1825,
      anchorEvent: "RECORDED_AT",
      ruleStatus: "CONFIRMED",
    },
    {
      itemCode: "TAX_DOCUMENT",
      itemName: "세금계산서와 현금영수증 발급 기록",
      reason: "세금 증빙의 보존",
      reviewTargetLaws: ["부가가치세법", "국세기본법"],
      retentionDays: 1825,
      anchorEvent: "ISSUED_AT",
      ruleStatus: "CONFIRMED",
    },
    {
      itemCode: "PRIVACY_REQUEST_RECORD",
      itemName: "개인정보 권리 요청과 처리 이력",
      reason: "요청 처리 사실의 증명",
      reviewTargetLaws: ["개인정보 보호법"],
      retentionDays: 1095,
      anchorEvent: "COMPLETED_AT",
      ruleStatus: "CONFIRMED",
    },
    {
      itemCode: "SUPPORT_INQUIRY",
      itemName: "지원 문의",
      reason: "분쟁과 불만 처리 기록",
      reviewTargetLaws: ["전자상거래법"],
      retentionDays: 1095,
      anchorEvent: "CLOSED_AT",
      ruleStatus: "CONFIRMED",
    },
    {
      itemCode: "OFFICE_CONTRACT_DOCUMENT",
      itemName: "사무소가 수탁 보관하는 거래계약서",
      reason: "사무소의 법정 서류 보존 의무 이행 지원",
      reviewTargetLaws: ["공인중개사법"],
      retentionDays: 1825,
      anchorEvent: "RECORDED_AT",
      ruleStatus: "CONFIRMED",
    },
    {
      itemCode: "OFFICE_EXPLANATION_DOCUMENT",
      itemName: "사무소가 수탁 보관하는 중개대상물 확인설명서",
      reason: "사무소의 법정 서류 보존 의무 이행 지원",
      reviewTargetLaws: ["공인중개사법"],
      retentionDays: 1095,
      anchorEvent: "RECORDED_AT",
      ruleStatus: "CONFIRMED",
    },
  ],
  displayRuleNotice:
    "담당 업무는 대표님에게 넘어가고 과거 담당 기록에는 탈퇴한 구성원으로 표시됩니다.",
};

type AccountState = {
  withdrawalPreview: WithdrawalPreviewResponse;
  withdrawn: boolean;
  termsVersion: string;
  me: MeResponse;
  unsubscribed: boolean;
  emailLinkCount: number;
  phoneVerificationRequired: boolean;
};

const state: AccountState = {
  withdrawalPreview: MOCK_WITHDRAWAL_PREVIEW,
  withdrawn: false,
  termsVersion: MOCK_TERMS_VERSION,
  me: MOCK_ME,
  unsubscribed: false,
  emailLinkCount: 0,
  phoneVerificationRequired: true,
};

export function setMockTermsVersion(version: string): void {
  state.termsVersion = version;
}

export function setMockPhoneVerificationRequired(required: boolean): void {
  state.phoneVerificationRequired = required;
}

export function getMockMe(): MeResponse {
  return state.me;
}

export function getMockTermsVersion(): string {
  return state.termsVersion;
}

export function setMockMe(me: MeResponse): void {
  state.me = me;
}

export function setMockWithdrawalPreview(preview: WithdrawalPreviewResponse): void {
  state.withdrawalPreview = preview;
}

export function isMockWithdrawn(): boolean {
  return state.withdrawn;
}

export function resetMockAccountState(): void {
  state.withdrawalPreview = MOCK_WITHDRAWAL_PREVIEW;
  state.withdrawn = false;
  state.termsVersion = MOCK_TERMS_VERSION;
  state.me = MOCK_ME;
  state.unsubscribed = false;
  state.emailLinkCount = 0;
  state.phoneVerificationRequired = true;
}

const NEW_ACCOUNT_CONTEXT = {
  accessCondition: "PRE_VERIFICATION" as const,
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

function unprocessable(code: string, message: string, extra?: Record<string, unknown>) {
  return errorResponse(422, code, message, extra);
}

export const accountHandlers = [
  http.get("/api/terms", () =>
    HttpResponse.json({
      items: currentTerms(),
      phoneVerificationRequired: state.phoneVerificationRequired,
    }),
  ),

  http.get("/api/me/withdrawal-preview", () => HttpResponse.json(state.withdrawalPreview)),

  http.delete("/api/me", () => {
    if (state.withdrawalPreview.isLastOwner) {
      return errorResponse(409, "LAST_OWNER", "유일한 대표는 탈퇴할 수 없습니다.");
    }
    state.withdrawn = true;
    return new HttpResponse(null, { status: 204 });
  }),

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
    if (!state.phoneVerificationRequired) {
      return errorResponse(503, "SMS_UNAVAILABLE", "문자 발송 수단이 구성되지 않았습니다.");
    }
    if (body.phone === "010-9999-9999") return mockErrors.rateLimited(30);
    return HttpResponse.json({ accepted: true, resendAfterSeconds: 60 }, { status: 202 });
  }),

  http.post("/api/auth/phone-verification/verify", async ({ request }) => {
    const body = (await request.json()) as { phone?: string; code?: string };
    if (body.code === "000000") {
      return unprocessable("VERIFICATION_CODE_INVALID", "인증번호가 맞지 않습니다.", {
        remainingAttempts: 4,
      });
    }
    if (body.code === "000005") {
      return unprocessable("VERIFICATION_CODE_INVALID", "인증번호가 맞지 않습니다.", {
        remainingAttempts: 0,
      });
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
      phone?: string;
      password?: string;
      displayName?: string;
      agreedTerms?: AgreedTerm[];
    };
    if (!state.phoneVerificationRequired && !/^01\d-\d{3,4}-\d{4}$/.test(body.phone ?? "")) {
      return mockErrors.validation([
        {
          field: "phone",
          code: "INVALID_FORMAT",
          message: "휴대폰 번호 형식이 올바르지 않습니다.",
        },
      ]);
    }
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
    // 가입이 끝나면 세션이 만들어지므로 이후 접근 상태 조회도 인증 전 상태를 돌려준다.
    setMockAuthContext({ ...MOCK_ACTIVE_CONTEXT, ...NEW_ACCOUNT_CONTEXT });
    return HttpResponse.json(NEW_ACCOUNT_CONTEXT, { status: 201 });
  }),

  http.post("/api/auth/signup/kakao", async ({ request }) => {
    const body = (await request.json()) as {
      verifiedPhoneTicket?: string;
      phone?: string;
      agreedTerms?: AgreedTerm[];
    };
    if (!state.phoneVerificationRequired && !/^01\d-\d{3,4}-\d{4}$/.test(body.phone ?? "")) {
      return mockErrors.validation([
        {
          field: "phone",
          code: "INVALID_FORMAT",
          message: "휴대폰 번호 형식이 올바르지 않습니다.",
        },
      ]);
    }
    if (body.verifiedPhoneTicket === "phone-ticket:010-1111-1111") {
      return errorResponse(409, "PHONE_ALREADY_REGISTERED", "이미 가입된 휴대폰 번호입니다.");
    }
    const stale = findStaleTerms(body.agreedTerms);
    if (stale.length > 0) {
      return errorResponse(409, "TERMS_VERSION_CHANGED", "약관이 바뀌었습니다.", {
        changedItems: stale,
      });
    }
    // 가입이 끝나면 세션이 만들어지므로 이후 접근 상태 조회도 인증 전 상태를 돌려준다.
    setMockAuthContext({ ...MOCK_ACTIVE_CONTEXT, ...NEW_ACCOUNT_CONTEXT });
    return HttpResponse.json(NEW_ACCOUNT_CONTEXT, { status: 201 });
  }),

  http.get("/api/auth/recovery-options", ({ request }) => {
    const url = new URL(request.url);
    const hasPhone = url.searchParams.has("verifiedPhoneTicket");
    const hasEmail = url.searchParams.has("verifiedEmailTicket");
    if (hasPhone === hasEmail) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "확인한 이메일 또는 휴대폰 중 하나만 보내 주세요.",
      );
    }
    return HttpResponse.json({
      existingAccountFound: true,
      availableLoginMethods: hasPhone ? ["EMAIL", "KAKAO"] : ["EMAIL"],
      passwordResetAvailable: true,
    });
  }),

  http.post("/api/auth/password/reset-request", () => HttpResponse.json({ accepted: true })),

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
      emailNoticeScheduled: status === "UNSUBSCRIBED" && body.token !== "no-email-token-000000",
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
    HttpResponse.json({ method: "EMAIL", linked: true }),
  ),

  http.post("/api/me/login-methods/kakao", async ({ request }) => {
    const body = (await request.json()) as { code?: string };
    if (body.code === "taken-code") {
      return errorResponse(409, "KAKAO_ALREADY_LINKED", "이미 다른 계정에 연결되었습니다.");
    }
    return HttpResponse.json({ method: "KAKAO", linked: true });
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
    if (field === "phone" && !state.phoneVerificationRequired) {
      state.me = { ...state.me, phone: body.phone ?? null, phoneVerified: false };
    }
    return HttpResponse.json({ field, value: body.email ?? body.phone ?? "", verifiedAt: NOW });
  }),
];
