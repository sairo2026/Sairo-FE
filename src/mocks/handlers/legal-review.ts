import { http, HttpResponse } from "msw";
import type { AuthContextResponse } from "@/lib/api/contracts/common.schema";
import type { PublicCompanyInfoResponse } from "@/lib/api/contracts/public-site.schema";
import { errorResponse } from "../error-responses";
import { MOCK_ACTIVE_CONTEXT } from "./auth";
import { MOCK_WITHDRAWAL_PREVIEW } from "./account";

export const REVIEW_SCENARIO_KEY = "sairo-review-scenario";

export const REVIEW_SCENARIOS = [
  "new-account",
  "reconsent",
  "terms-changed",
  "suspended",
  "last-owner",
  "kakao-account",
] as const;

export type ReviewScenario = (typeof REVIEW_SCENARIOS)[number];

export const REVIEW_COMPANY_INFO: PublicCompanyInfoResponse = {
  versionNo: 1,
  publishedAt: "2026-11-10T09:00:00+09:00",
  businessName: "사이로(SAIRO)",
  representativeName: "김태환",
  businessNumber: "704-16-02872",
  address: "경기도 고양시 덕양구 백양로 51, 902호 A-5(화정동, 네이버타운)",
  contactPhone: "",
  ecommerceNotice: null,
  supportEmail: "support@example.com",
  privacyContact: "privacy@example.com",
  privacyRequestPath: "/privacy-requests",
  links: [
    { kind: "TERMS", title: "이용약관", url: "/legal/policies/TERMS/1.0" },
    { kind: "PRIVACY", title: "개인정보처리방침", url: "/legal/policies/PRIVACY/1.0" },
    { kind: "REFUND", title: "환불정책", url: "/legal/policies/REFUND/1.0" },
  ],
};

const OWNER_CONTEXT: AuthContextResponse = {
  ...MOCK_ACTIVE_CONTEXT,
  role: "OWNER",
};

const NEW_ACCOUNT_CONTEXT: AuthContextResponse = {
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
  reconsentRequired: false,
};

function currentScenario(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(REVIEW_SCENARIO_KEY) ?? "";
  } catch {
    return "";
  }
}

export const legalReviewHandlers = [
  http.get("/api/public/company-info", () => HttpResponse.json(REVIEW_COMPANY_INFO)),

  http.get("/api/auth/context", () => {
    const scenario = currentScenario();
    if (scenario === "new-account") return HttpResponse.json(NEW_ACCOUNT_CONTEXT);
    if (scenario === "reconsent") {
      return HttpResponse.json({ ...OWNER_CONTEXT, reconsentRequired: true });
    }
    return HttpResponse.json(OWNER_CONTEXT);
  }),

  http.get("/api/me/terms-reconsent", () => {
    if (currentScenario() !== "reconsent") return undefined;
    return HttpResponse.json({
      reconsentRequired: true,
      items: [
        {
          termsCode: "TOS",
          previousVersion: "1.0",
          version: "1.1",
          category: "TERMS",
          required: true,
          effectiveAt: "2026-12-01T04:00:00+09:00",
          changeSummary: "구독·결제 조건 안내 문구가 바뀌었습니다.",
          documentUrl: "/legal/terms",
          previousDocumentUrl: null,
        },
        {
          termsCode: "MARKETING",
          previousVersion: "1.0",
          version: "1.1",
          category: "MARKETING",
          required: false,
          effectiveAt: "2026-12-01T04:00:00+09:00",
          changeSummary: "수신 동의 안내 문구가 바뀌었습니다.",
          documentUrl: "/legal/marketing",
          previousDocumentUrl: null,
        },
      ],
    });
  }),

  http.post("/api/auth/signup/email", () => {
    if (currentScenario() !== "terms-changed") return undefined;
    return errorResponse(409, "TERMS_VERSION_CHANGED", "약관이 바뀌었습니다.", {
      changedItems: [
        {
          termsCode: "TOS",
          changeSummary: "구독·결제 조건 안내 문구가 바뀌었습니다.",
          documentUrl: "/legal/terms",
        },
      ],
    });
  }),

  http.post("/api/auth/signup/kakao", () => {
    if (currentScenario() !== "terms-changed") return undefined;
    return errorResponse(409, "TERMS_VERSION_CHANGED", "약관이 바뀌었습니다.", {
      changedItems: [
        {
          termsCode: "TOS",
          changeSummary: "구독·결제 조건 안내 문구가 바뀌었습니다.",
          documentUrl: "/legal/terms",
        },
      ],
    });
  }),

  http.get("/api/offices/current/auth-status", () => {
    if (currentScenario() !== "suspended") return undefined;
    return HttpResponse.json({
      authSuspended: true,
      suspendedAt: "2026-12-01T09:00:00+09:00",
      reauthDeadlineAt: "2026-12-31T09:00:00+09:00",
      trialRemainingSeconds: 90_000,
    });
  }),

  http.get("/api/me/withdrawal-preview", () => {
    const scenario = currentScenario();
    if (scenario === "last-owner") {
      return HttpResponse.json({
        ...MOCK_WITHDRAWAL_PREVIEW,
        isOwner: true,
        isLastOwner: true,
        kakaoLinked: true,
      });
    }
    if (scenario === "kakao-account") {
      return HttpResponse.json({ ...MOCK_WITHDRAWAL_PREVIEW, kakaoLinked: true });
    }
    return undefined;
  }),
];
