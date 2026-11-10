import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import type {
  OperatorMemberDetailResponse,
  OperatorOfficeDetailResponse,
  OpsHomeResponse,
} from "@/lib/api/contracts/ops.schema";
import { OPS_ROLES, OPS_WORK_ROLES } from "@/features/ops/model/roles";
import { errorResponse, mockErrors } from "../error-responses";
import { MOCK_OTP_CODE, getMockOperator, requireMockOps, setMockOperator } from "./ops-session";

const INVITATION_TOKENS: Record<string, "VALID" | "EXPIRED" | "CANCELLED" | "ACCEPTED"> = {
  "valid-token": "VALID",
  "expired-token": "EXPIRED",
  "cancelled-token": "CANCELLED",
  "accepted-token": "ACCEPTED",
};

export const MOCK_INVITATION_SECRET = "JBSWY3DPEHPK3PXP";
const ACCEPT_ATTEMPT_LIMIT = 5;

type MockInvitationState = {
  hasEnrollmentCookie: boolean;
  enrollmentSeconds: number;
  kakaoAlreadyOperator: boolean;
  acceptAttempts: number;
  issuedCount: number;
  qrImageUrl: string | null;
};

const invitationDefaults: MockInvitationState = {
  hasEnrollmentCookie: true,
  enrollmentSeconds: 900,
  kakaoAlreadyOperator: false,
  acceptAttempts: 0,
  issuedCount: 0,
  qrImageUrl: null,
};

export const mockInvitation: MockInvitationState = { ...invitationDefaults };

const homeDefaults: Omit<OpsHomeResponse, "execSummary"> = {
  pendingReviewCount: 7,
  overdueReviewCount: 2,
  unassignedInquiryCount: 4,
  paymentPendingCount: 3,
  refundFailedCount: 1,
  migrationReviewPendingCount: 5,
  privacyDeadlineApproachingCount: 2,
  deletionFailedCount: 0,
  activeIncidentCount: 1,
};

export const mockHome: { counts: Omit<OpsHomeResponse, "execSummary"> } = {
  counts: { ...homeDefaults },
};

const MOCK_EXEC_SUMMARY = {
  trialOfficeCount: 12,
  activeOfficeCount: 34,
  pastDueOfficeCount: 2,
  endedOfficeCount: 5,
  netCollectedAmount: 4_250_000,
  asOf: "2026-11-10T09:00:00+09:00",
};

export function buildMockOffice(
  officeId: number,
  overrides: Partial<OperatorOfficeDetailResponse> = {},
): OperatorOfficeDetailResponse {
  return {
    officeId,
    name: `테스트중개 ${officeId}`,
    representativeName: "홍*동",
    businessRegistrationNumber: "123-45-*****",
    realEstateLicenseNumber: "11680-****-*****",
    phone: "010-****-1234",
    address: "서울시 강남구 역삼동",
    createdAt: "2026-07-01T09:00:00+09:00",
    approvedMembershipCount: 3,
    registrationAuthority: "서울특별시 강남구청",
    registrationStatus: "APPROVED",
    registrationHistory: [
      {
        fromStatus: null,
        toStatus: "PENDING_REVIEW",
        changedByType: "USER",
        reason: null,
        createdAt: "2026-07-01T09:00:00+09:00",
      },
      {
        fromStatus: "PENDING_REVIEW",
        toStatus: "APPROVED",
        changedByType: "OPERATOR",
        reason: "서류 확인 완료",
        createdAt: "2026-07-02T10:00:00+09:00",
      },
    ],
    members: [
      { membershipId: 1, displayName: "홍*동", role: "OWNER", status: "APPROVED" },
      { membershipId: 2, displayName: "김*수", role: "AGENT", status: "APPROVED" },
    ],
    employmentRoster: { agentCount: 2, deputyCount: 1 },
    subscription: {
      status: "ACTIVE",
      plan: "TEAM",
      trialEndsAt: null,
      currentPeriodEnd: "2026-12-01T00:00:00+09:00",
      pastDueSince: null,
    },
    openInquiryCount: 1,
    returnGrant: null,
    archiveGrant: null,
    updatedAt: "2026-11-01T09:00:00+09:00",
    version: 1,
    ...overrides,
  };
}

export function buildMockMember(
  userId: number,
  overrides: Partial<OperatorMemberDetailResponse> = {},
): OperatorMemberDetailResponse {
  return {
    userId,
    displayName: `회원 ${userId}`,
    accountStatus: "ACTIVE",
    withdrawnAt: null,
    currentMembership: { officeId: 501, officeName: "테스트중개 501", role: "AGENT" },
    pendingRequestSummary: null,
    loginMethods: ["KAKAO"],
    lastLoginAt: "2026-11-09T09:12:00+09:00",
    loginLockedUntil: null,
    sessions: [
      {
        sessionId: "s-7f3a91",
        createdAt: "2026-11-09T09:12:00+09:00",
        lastSeenAt: "2026-11-09T10:03:00+09:00",
        deviceSummary: "Chrome / Windows",
      },
      {
        sessionId: "s-2b9c04",
        createdAt: "2026-11-08T18:30:00+09:00",
        lastSeenAt: "2026-11-09T08:00:00+09:00",
        deviceSummary: "Safari / iPhone",
      },
    ],
    securityEvents: [],
    ...overrides,
  };
}

type MockOfficeRecord = { detail: OperatorOfficeDetailResponse };
type MockMemberRecord = { detail: OperatorMemberDetailResponse; createdAt: string };

function defaultOffices(): MockOfficeRecord[] {
  return [
    { detail: buildMockOffice(501, { name: "사이로중개" }) },
    {
      detail: buildMockOffice(502, {
        name: "한강공인중개사사무소",
        registrationStatus: "REVOKED",
        subscription: null,
      }),
    },
    {
      detail: buildMockOffice(503, {
        name: "나눔공인중개사사무소",
        subscription: {
          status: "TRIAL",
          plan: "SOLO",
          trialEndsAt: "2026-12-30T00:00:00+09:00",
          currentPeriodEnd: "2026-12-30T00:00:00+09:00",
          pastDueSince: null,
        },
      }),
    },
  ];
}

function defaultMembers(): MockMemberRecord[] {
  return [
    {
      detail: buildMockMember(42, { displayName: "홍길동" }),
      createdAt: "2026-07-01T09:00:00+09:00",
    },
    {
      detail: buildMockMember(43, {
        displayName: "김영희",
        currentMembership: null,
        loginMethods: ["EMAIL", "KAKAO"],
        sessions: [],
      }),
      createdAt: "2026-07-05T09:00:00+09:00",
    },
    {
      detail: buildMockMember(44, {
        displayName: "탈퇴회원",
        accountStatus: "WITHDRAWN",
        withdrawnAt: "2026-10-01T09:00:00+09:00",
        currentMembership: null,
        sessions: [],
      }),
      createdAt: "2026-07-10T09:00:00+09:00",
    },
  ];
}

export const mockOffices: { items: MockOfficeRecord[] } = { items: defaultOffices() };
export const mockMembers: { items: MockMemberRecord[] } = { items: defaultMembers() };

export function resetOpsHomeMock(): void {
  mockHome.counts = { ...homeDefaults };
  mockOffices.items = defaultOffices();
  mockMembers.items = defaultMembers();
  Object.assign(mockInvitation, invitationDefaults);
}

function pageOf<T>(url: URL, rows: T[]) {
  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));
  const size = Math.max(1, Number(url.searchParams.get("size") ?? 25));
  return {
    items: rows.slice(page * size, page * size + size),
    page,
    size,
    totalElements: rows.length,
  };
}

function toOfficeListItem(detail: OperatorOfficeDetailResponse) {
  return {
    officeId: detail.officeId,
    name: detail.name,
    businessRegistrationNumber: detail.businessRegistrationNumber,
    realEstateLicenseNumber: detail.realEstateLicenseNumber,
    registrationAuthority: detail.registrationAuthority,
    address: detail.address,
    registrationStatus: detail.registrationStatus,
    subscriptionStatus: detail.subscription?.status ?? null,
    approvedMembershipCount: detail.approvedMembershipCount,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    version: detail.version,
  };
}

function invitationError(state: "EXPIRED" | "CANCELLED" | "ACCEPTED") {
  return HttpResponse.json(
    {
      code: "INVITATION_NOT_USABLE",
      message: "사용할 수 없는 초대입니다.",
      traceId: "mock-trace-0001",
      invitationState: state,
    },
    { status: 409 },
  );
}

async function readToken(request: Request): Promise<string | null> {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body === "object" && body !== null && "token" in body) {
    return typeof body.token === "string" ? body.token : null;
  }
  return null;
}

function checkInvitation(token: string | null): Response | null {
  if (token === null || token === "") {
    return mockErrors.validation([{ field: "token", message: "초대 토큰을 입력해 주세요." }]);
  }
  const kind = INVITATION_TOKENS[token];
  if (kind === undefined) return mockErrors.notFound();
  if (kind !== "VALID") return invitationError(kind);
  return null;
}

export const opsHomeHandlers: RequestHandler[] = [
  http.get("/api/ops/home", () => {
    const rejected = requireMockOps();
    if (rejected) return rejected;
    const isExec = getMockOperator()?.roles.includes("EXEC_VIEW") ?? false;
    return HttpResponse.json({
      ...mockHome.counts,
      ...(isExec ? { execSummary: MOCK_EXEC_SUMMARY } : {}),
    });
  }),

  http.get("/api/ops/offices", ({ request }) => {
    const rejected = requireMockOps(OPS_ROLES);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const keyword = (url.searchParams.get("keyword") ?? "").trim();
    const registrationStatus = url.searchParams.get("registrationStatus");
    const subscriptionStatus = url.searchParams.get("subscriptionStatus");
    const rows = mockOffices.items
      .map((record) => record.detail)
      .filter((detail) => keyword === "" || detail.name.includes(keyword))
      .filter((detail) => !registrationStatus || detail.registrationStatus === registrationStatus)
      .filter((detail) => !subscriptionStatus || detail.subscription?.status === subscriptionStatus)
      .map(toOfficeListItem);
    return HttpResponse.json(pageOf(url, rows));
  }),

  http.get("/api/ops/offices/:officeId", ({ params }) => {
    const rejected = requireMockOps(OPS_WORK_ROLES);
    if (rejected) return rejected;
    const found = mockOffices.items.find(
      (record) => String(record.detail.officeId) === params.officeId,
    );
    return found ? HttpResponse.json(found.detail) : mockErrors.notFound();
  }),

  http.get("/api/ops/members", ({ request }) => {
    const rejected = requireMockOps(OPS_WORK_ROLES);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const keyword = (url.searchParams.get("keyword") ?? "").trim();
    const accountStatus = url.searchParams.get("accountStatus");
    const rows = mockMembers.items
      .filter(
        ({ detail }) =>
          keyword === "" ||
          detail.displayName.includes(keyword) ||
          (detail.currentMembership?.officeName ?? "").includes(keyword),
      )
      .filter(({ detail }) => !accountStatus || detail.accountStatus === accountStatus)
      .map(({ detail, createdAt }) => ({
        userId: detail.userId,
        displayName: detail.displayName,
        accountStatus: detail.accountStatus,
        officeName: detail.currentMembership?.officeName ?? null,
        createdAt,
      }));
    return HttpResponse.json(pageOf(url, rows));
  }),

  http.get("/api/ops/members/:userId", ({ params }) => {
    const rejected = requireMockOps(OPS_WORK_ROLES);
    if (rejected) return rejected;
    const found = mockMembers.items.find(
      (record) => String(record.detail.userId) === params.userId,
    );
    return found ? HttpResponse.json(found.detail) : mockErrors.notFound();
  }),

  http.post("/api/ops/members/:userId/emergency-suspend", async ({ params, request }) => {
    const rejected = requireMockOps(["SECURITY_ADMIN"]);
    if (rejected) return rejected;
    const record = mockMembers.items.find((item) => String(item.detail.userId) === params.userId);
    if (!record) return mockErrors.notFound();
    const body: unknown = await request.json().catch(() => null);
    const input =
      typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    const scope = input.scope;
    const reviewAt = input.reviewAt;
    const sessionId = input.sessionId;
    if (reason === "" || typeof reviewAt !== "string") {
      return mockErrors.validation([
        { field: "reason", message: "사유와 재검토 시각을 입력해 주세요." },
      ]);
    }
    if (scope === "SPECIFIC_SESSION") {
      const exists = record.detail.sessions.some((session) => session.sessionId === sessionId);
      if (typeof sessionId !== "string" || !exists) {
        return mockErrors.validation([
          { field: "sessionId", message: "종료할 세션을 선택해 주세요." },
        ]);
      }
    } else if (scope !== "ALL_SESSIONS" || (sessionId !== null && sessionId !== undefined)) {
      return mockErrors.validation([{ field: "scope", message: "중단 범위를 확인해 주세요." }]);
    }
    const suspendedAt = "2026-11-10T09:30:00+09:00";
    record.detail.sessions =
      scope === "ALL_SESSIONS"
        ? []
        : record.detail.sessions.filter((session) => session.sessionId !== sessionId);
    record.detail.securityEvents = [
      {
        eventType: "EMERGENCY_SUSPENDED",
        occurredAt: suspendedAt,
        scope,
        reason,
        reviewAt,
        actorOperatorName: getMockOperator()?.name ?? "운영자",
      },
      ...record.detail.securityEvents,
    ];
    return HttpResponse.json({ userId: record.detail.userId, scope, suspendedAt, reviewAt });
  }),

  http.post("/api/ops/auth/invitations/preview", async ({ request }) => {
    const token = await readToken(request);
    const rejected = checkInvitation(token);
    if (rejected) return rejected;
    return HttpResponse.json({
      inviteeName: "김운영",
      roles: ["SUPPORT", "BILLING"],
      expiresAt: "2026-11-13T09:00:00+09:00",
    });
  }),

  http.post("/api/ops/auth/invitations/kakao-start", async ({ request }) => {
    const rejected = checkInvitation(await readToken(request));
    if (rejected) return rejected;
    return HttpResponse.json({
      authorizationUrl: "https://kauth.kakao.com/oauth/authorize?state=mock-state",
    });
  }),

  http.post("/api/ops/auth/invitations/mfa-enrollment", () => {
    if (!mockInvitation.hasEnrollmentCookie) return mockErrors.unauthenticated();
    if (mockInvitation.kakaoAlreadyOperator) {
      return errorResponse(409, "OPERATOR_ALREADY_EXISTS", "이미 운영자 계정이 있습니다.");
    }
    mockInvitation.issuedCount += 1;
    return HttpResponse.json({
      otpauthUri: `otpauth://totp/SAIRO:ops?secret=${MOCK_INVITATION_SECRET}&issuer=SAIRO`,
      secret: MOCK_INVITATION_SECRET,
      enrollmentExpiresAt: new Date(
        Date.now() + mockInvitation.enrollmentSeconds * 1000,
      ).toISOString(),
      ...(mockInvitation.qrImageUrl ? { qrImageUrl: mockInvitation.qrImageUrl } : {}),
    });
  }),

  http.post("/api/ops/auth/invitations/accept", async ({ request }) => {
    if (!mockInvitation.hasEnrollmentCookie) return mockErrors.unauthenticated();
    if (mockInvitation.kakaoAlreadyOperator) {
      return errorResponse(409, "OPERATOR_ALREADY_EXISTS", "이미 운영자 계정이 있습니다.");
    }
    if (mockInvitation.acceptAttempts >= ACCEPT_ATTEMPT_LIMIT) {
      return mockErrors.rateLimited(60);
    }
    const body: unknown = await request.json().catch(() => null);
    const code =
      typeof body === "object" &&
      body !== null &&
      "otpCode" in body &&
      typeof body.otpCode === "string"
        ? body.otpCode
        : null;
    if (code === null || !/^\d{6}$/.test(code)) {
      return mockErrors.validation([{ field: "otpCode", message: "6자리 숫자를 입력해 주세요." }]);
    }
    mockInvitation.acceptAttempts += 1;
    if (code !== MOCK_OTP_CODE) {
      return errorResponse(401, "MFA_CODE_INVALID", "확인 코드가 맞지 않습니다.");
    }
    const operator = { operatorId: 7, name: "김운영", roles: ["SUPPORT", "BILLING"] };
    setMockOperator(operator);
    return HttpResponse.json(
      { ...operator, acceptedAt: "2026-11-10T09:00:00+09:00" },
      { status: 201 },
    );
  }),
];
