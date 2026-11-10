import { http, HttpResponse } from "msw";
import type {
  LoginHistoryResponse,
  TermsAgreementHistoryResponse,
} from "@/lib/api/contracts/auth.schema";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockMe, getMockTermsVersion, setMockMe } from "./account";

const NOW = "2026-11-10T09:00:00+09:00";

type HistoryItem = TermsAgreementHistoryResponse["items"][number];
type LoginItem = LoginHistoryResponse["items"][number];

export type MockSettingsState = {
  termsHistory: HistoryItem[];
  loginHistory: LoginItem[];
  nextAgreementId: number;
  isLastOwner: boolean;
  office: { name: string };
  leaveCount: number;
  closeCount: number;
};

function initialState(): MockSettingsState {
  return {
    termsHistory: [
      {
        agreementId: 3,
        termsCode: "MARKETING",
        termsName: "이메일 공지·혜택 안내 수신 동의",
        version: "1.0",
        agreed: false,
        consentPath: "ACCOUNT_SETTINGS",
        recordedAt: "2026-11-05T09:00:00+09:00",
      },
      {
        agreementId: 2,
        termsCode: "MARKETING",
        termsName: "이메일 공지·혜택 안내 수신 동의",
        version: "1.0",
        agreed: true,
        consentPath: "SIGNUP_EMAIL",
        recordedAt: "2026-11-01T09:00:00+09:00",
      },
      {
        agreementId: 1,
        termsCode: "TOS",
        termsName: "이용약관",
        version: "1.0",
        agreed: true,
        consentPath: "UNKNOWN",
        recordedAt: "2026-10-01T09:00:00+09:00",
      },
    ],
    loginHistory: [
      {
        loginHistoryId: 1,
        authMethod: "EMAIL",
        ipAddress: "203.0.113.10",
        userAgent: "Chrome 130 / Windows",
        createdAt: "2026-11-10T08:00:00+09:00",
      },
      {
        loginHistoryId: 2,
        authMethod: "KAKAO",
        ipAddress: "203.0.113.11",
        userAgent: "Safari 18 / iOS",
        createdAt: "2026-11-09T08:00:00+09:00",
      },
    ],
    nextAgreementId: 10,
    isLastOwner: false,
    office: { name: "새봄공인중개사사무소" },
    leaveCount: 0,
    closeCount: 0,
  };
}

export const settingsState: MockSettingsState = initialState();

export function resetSettingsState() {
  Object.assign(settingsState, initialState());
}

function pushHistory(termsCode: string, agreed: boolean, version: string, path: string) {
  const me = getMockMe();
  const existing = me.termsAgreements.find((item) => item.termsCode === termsCode);
  const termsName = existing?.termsName ?? termsCode;
  settingsState.termsHistory.unshift({
    agreementId: settingsState.nextAgreementId,
    termsCode,
    termsName,
    version,
    agreed,
    consentPath: path,
    recordedAt: NOW,
  });
  settingsState.nextAgreementId += 1;
}

function applyAgreement(termsCode: string, agreed: boolean, version: string) {
  const me = getMockMe();
  const agreements = me.termsAgreements.map((item) =>
    item.termsCode === termsCode
      ? { ...item, agreed, termsVersion: version, recordedAt: NOW }
      : item,
  );
  const channels =
    termsCode === "MARKETING"
      ? { ...me.notificationPreferences.channels, MARKETING: agreed }
      : me.notificationPreferences.channels;
  setMockMe({
    ...me,
    termsAgreements: agreements,
    notificationPreferences: { ...me.notificationPreferences, channels },
  });
}

/** 동의 기록 요청을 반영한다. 거절해야 하면 오류 응답을, 아니면 null을 돌려준다. */
export function recordMockAgreement(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  const { termsCode, version, agreed, consentPath } = body as {
    termsCode?: string;
    version?: string;
    agreed?: boolean;
    consentPath?: string;
  };
  if (!termsCode || typeof agreed !== "boolean" || !version) return null;
  if (consentPath !== "ACCOUNT_SETTINGS") return null;
  const me = getMockMe();
  const target = me.termsAgreements.find((item) => item.termsCode === termsCode);
  if (!agreed && target?.required) {
    return errorResponse(409, "TERMS_WITHDRAWAL_NOT_ALLOWED", "철회 불가");
  }
  if (agreed) {
    if (version !== getMockTermsVersion()) {
      return errorResponse(409, "TERMS_VERSION_CHANGED", "약관 변경", {
        changedItems: [],
      });
    }
    if (termsCode === "MARKETING" && !(me.email && me.emailVerified)) {
      return errorResponse(422, "MARKETING_EMAIL_REQUIRED", "이메일 필요");
    }
  }
  pushHistory(termsCode, agreed, version, consentPath ?? "ACCOUNT_SETTINGS");
  if (target) applyAgreement(termsCode, agreed, version);
  return null;
}

export const settingsHandlers = [
  http.patch("/api/me", async ({ request }) => {
    const body = (await request.json()) as { displayName?: string };
    if (!body.displayName?.trim()) {
      return mockErrors.validation([{ field: "displayName", message: "이름이 필요합니다." }]);
    }
    const me = getMockMe();
    setMockMe({ ...me, displayName: body.displayName });
    return HttpResponse.json({
      userId: me.userId,
      displayName: body.displayName,
      email: me.email,
      emailVerified: me.emailVerified,
      phone: me.phone,
      phoneVerified: me.phoneVerified,
      kakaoLinked: me.kakaoLinked,
      accountStatus: me.accountStatus,
      createdAt: me.createdAt,
    });
  }),

  http.patch("/api/me/notification-preferences", async ({ request }) => {
    const body = (await request.json()) as { channels: Record<string, boolean> };
    const me = getMockMe();
    const channels = { ...me.notificationPreferences.channels };
    for (const [key, value] of Object.entries(body.channels)) {
      if (key === "MARKETING") {
        if (value) {
          return mockErrors.validation([
            { field: "channels.MARKETING", message: "약관 동의로만 켤 수 있습니다." },
          ]);
        }
        channels.MARKETING = false;
        pushHistory("MARKETING", false, getMockTermsVersion(), "ACCOUNT_SETTINGS");
        applyAgreement("MARKETING", false, getMockTermsVersion());
      } else if (key === "VISIT_REMINDER") {
        channels.VISIT_REMINDER = value;
      }
    }
    const next = getMockMe();
    setMockMe({
      ...next,
      notificationPreferences: {
        ...next.notificationPreferences,
        channels: { ...channels, MARKETING: next.notificationPreferences.channels.MARKETING },
      },
    });
    return HttpResponse.json({ channels: getMockMe().notificationPreferences.channels });
  }),

  http.get("/api/me/login-history", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 25);
    const body: LoginHistoryResponse = {
      items: settingsState.loginHistory.slice(page * size, page * size + size),
      page,
      size,
      totalElements: settingsState.loginHistory.length,
    };
    return HttpResponse.json(body);
  }),

  http.get("/api/me/terms-agreements", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 25);
    const body: TermsAgreementHistoryResponse = {
      items: settingsState.termsHistory.slice(page * size, page * size + size),
      page,
      size,
      totalElements: settingsState.termsHistory.length,
    };
    return HttpResponse.json(body);
  }),

  http.post("/api/memberships/me/leave", () => {
    if (settingsState.isLastOwner) return errorResponse(409, "LAST_OWNER", "유일한 대표");
    settingsState.leaveCount += 1;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/offices/current/close", async ({ request }) => {
    const body = (await request.json()) as { confirmed?: boolean; archiveChoice?: string };
    if (body.confirmed !== true || !["REQUEST", "DECLINE"].includes(body.archiveChoice ?? "")) {
      return mockErrors.validation([{ field: "archiveChoice", message: "선택이 필요합니다." }]);
    }
    settingsState.closeCount += 1;
    return HttpResponse.json({
      officeId: 12,
      subscriptionStatus: "ENDED",
      returnGrantId: 101,
      returnExpiresAt: "2026-12-10T09:00:00+09:00",
      archiveRequestStatus: body.archiveChoice === "REQUEST" ? "REQUESTED" : "NONE",
    });
  }),
];
