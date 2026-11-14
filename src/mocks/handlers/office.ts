import { http, HttpResponse } from "msw";
import type {
  EmploymentRosterListResponse,
  MembershipDetailResponse,
  MembershipStatusResponse,
  OfficeChangeRequestListResponse,
  OfficeDetailResponse,
  OfficeMembershipListResponse,
  OfficeRegistrationStatusResponse,
  OfficeSearchResponse,
  OwnerTransferCurrentResponse,
} from "@/lib/api/contracts/office.schema";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockAuthContext, setMockAuthContext } from "./auth";

const NOW = "2026-11-10T09:00:00+09:00";
const LATER = "2026-11-17T09:00:00+09:00";

type MemberItem = OfficeMembershipListResponse["items"][number];
type RosterItem = EmploymentRosterListResponse["items"][number];
type ChangeItem = OfficeChangeRequestListResponse["items"][number];
type SearchItem = OfficeSearchResponse["items"][number];

export type EvidenceMode = "ok" | "invalid-file" | "invalid-transition";

type OfficeMockState = {
  registration: OfficeRegistrationStatusResponse | null;
  evidenceMode: EvidenceMode;
  office: OfficeDetailResponse;
  myMembership: MembershipStatusResponse | null;
  searchable: SearchItem[];
  members: MemberItem[];
  roster: RosterItem[];
  quota: EmploymentRosterListResponse["quota"];
  transfer: OwnerTransferCurrentResponse | null;
  changeRequests: ChangeItem[];
  detail: MembershipDetailResponse;
};

export const MOCK_OFFICE: OfficeDetailResponse = {
  officeId: 12,
  name: "사이로 공인중개사사무소",
  entityType: "INDIVIDUAL",
  registrationAuthority: "서울특별시 종로구",
  realEstateLicenseNumber: "11110-2026-00001",
  businessRegistrationNumber: "123-45-67890",
  representativeName: "김대표",
  representativePhone: "010-1111-2222",
  address: "서울특별시 종로구 종로 1",
  createdAt: NOW,
  updatedAt: NOW,
  version: 3,
};

function member(partial: Partial<MemberItem> & Pick<MemberItem, "membershipId" | "displayName">) {
  const base: MemberItem = {
    membershipId: partial.membershipId,
    userId: partial.membershipId + 100,
    displayName: partial.displayName,
    role: "AGENT",
    status: "APPROVED",
    approvedAt: NOW,
    requestSource: "REQUEST",
    expiresAt: null,
    invitationAcceptedAt: null,
    qualificationNumber: `자격-${partial.membershipId}`,
    employmentReportConfirmed: true,
    trainingConfirmed: true,
    billable: true,
    officeId: 12,
    createdAt: NOW,
    updatedAt: NOW,
    version: 1,
  };
  return { ...base, ...partial };
}

function initialState(): OfficeMockState {
  return {
    registration: null,
    evidenceMode: "ok",
    office: { ...MOCK_OFFICE },
    myMembership: null,
    searchable: [
      {
        officeId: 5,
        name: "땡땡사무소",
        entityType: "INDIVIDUAL",
        registrationAuthority: "서울특별시 성북구",
        realEstateLicenseNumber: "11290-2025-00007",
        address: "서울특별시 성북구 정릉로 77",
      },
    ],
    members: [
      member({ membershipId: 1, displayName: "김대표", role: "OWNER" }),
      member({ membershipId: 2, displayName: "이중개" }),
      member({ membershipId: 3, displayName: "박보조", role: "DEPUTY", qualificationNumber: null }),
    ],
    roster: [
      {
        rosterId: 1,
        officeId: 12,
        membershipId: 1,
        personName: "김대표",
        legalQualification: "AGENT",
        employmentStartDate: "2026-01-01",
        employmentEndDate: null,
        confirmationSource: "REGISTRATION_DOC",
        createdAt: NOW,
        updatedAt: NOW,
        version: MOCK_OFFICE.version,
      },
    ],
    quota: { qualifiedCount: 2, deputyCount: 1, deputyLimit: 10, exceeded: false },
    transfer: null,
    changeRequests: [],
    detail: {
      membershipId: 2,
      officeId: 12,
      userId: 102,
      displayName: "이중개",
      role: "AGENT",
      status: "APPROVED",
      requestSource: "REQUEST",
      qualificationNumber: "자격-2",
      employmentReportConfirmed: true,
      trainingConfirmed: true,
      billable: true,
      approvedAt: NOW,
      assignedCounts: { customers: 4, properties: 7, tasks: 2, contracts: 1, confirmedVisits: 3 },
      createdAt: NOW,
      updatedAt: NOW,
      version: 5,
    },
  };
}

const state: OfficeMockState = initialState();

export function setMockOfficeState(partial: Partial<OfficeMockState>): void {
  Object.assign(state, partial);
}

export function getMockOfficeState(): OfficeMockState {
  return state;
}

export function resetMockOfficeState(): void {
  Object.assign(state, initialState());
}

export { member as buildMockMember };

function paged<T>(items: T[], url: URL) {
  const page = Number(url.searchParams.get("page") ?? "0");
  const size = Number(url.searchParams.get("size") ?? "25");
  return {
    items: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
  };
}

/** 백엔드는 고용명부 변경마다 사무소 집계 버전을 올리고 모든 명부 항목이 그 버전을 쓴다. */
function bumpOfficeVersion(): number {
  state.office = { ...state.office, version: state.office.version + 1 };
  return state.office.version;
}

function invalid(field: string, code: string, message: string) {
  return mockErrors.validation([{ field, code, message }]);
}

export const officeHandlers = [
  http.get("/api/offices/lookup", ({ request }) => {
    const license = new URL(request.url).searchParams.get("realEstateLicenseNumber");
    return HttpResponse.json({ existingOfficeId: license === "11110-2026-00001" ? 5 : null });
  }),

  http.post("/api/office-registrations", async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    if (body.requestedOfficeName === "진행중사무소") {
      return errorResponse(409, "PENDING_REGISTRATION_EXISTS", "진행 중 신청이 있습니다.");
    }
    if (body.realEstateLicenseNumber === "11110-2026-00001") {
      return errorResponse(409, "OFFICE_ALREADY_EXISTS", "이미 등록된 사무소입니다.");
    }
    if (body.requestedOfficeName === "형식오류사무소") {
      return invalid("requestedAddress", "INVALID_VALUE", "주소 형식이 올바르지 않습니다.");
    }
    const created: OfficeRegistrationStatusResponse = {
      registrationId: 31,
      status: "DRAFT",
      currentRevisionNo: 1,
      entityType: body.entityType === "CORPORATION" ? "CORPORATION" : "INDIVIDUAL",
    };
    state.registration = created;
    return HttpResponse.json(
      {
        registrationId: 31,
        status: "DRAFT",
        currentRevisionNo: 1,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
        ...(body.businessRegistrationNumber === "111-11-11111"
          ? { warning: "DUPLICATE_BUSINESS_NUMBER" }
          : {}),
      },
      { status: 201 },
    );
  }),

  http.post("/api/office-registrations/:registrationId/evidence", () => {
    if (state.evidenceMode === "invalid-file") {
      return mockErrors.validation([
        {
          field: "BUSINESS_CERTIFICATE",
          code: "INVALID_VALUE",
          message: "주민등록번호 뒷자리가 보입니다.",
        },
      ]);
    }
    if (state.evidenceMode === "invalid-transition") {
      return errorResponse(409, "INVALID_TRANSITION", "이미 심사 중입니다.");
    }
    state.registration = {
      registrationId: 31,
      status: "PENDING_REVIEW",
      currentRevisionNo: 1,
      entityType: state.registration?.entityType ?? "INDIVIDUAL",
    };
    // 증빙 제출로 심사가 시작되면 신청자의 접근 상태도 심사 중으로 바뀐다.
    const context = getMockAuthContext();
    if (context?.accessCondition === "PRE_VERIFICATION") {
      setMockAuthContext({
        ...context,
        accessCondition: "OFFICE_UNDER_REVIEW",
        pendingRegistrationId: 31,
      });
    }
    return HttpResponse.json({
      registrationId: 31,
      status: "PENDING_REVIEW",
      currentRevisionNo: 1,
      createdAt: NOW,
      updatedAt: NOW,
      version: 2,
    });
  }),

  http.get("/api/office-registrations/me", () => {
    if (!state.registration) return mockErrors.notFound();
    return HttpResponse.json(state.registration);
  }),

  http.post("/api/office-registrations/:registrationId/cancel", () => {
    if (!state.registration) return mockErrors.notFound();
    state.registration = { ...state.registration, status: "CANCELLED" };
    return HttpResponse.json({
      registrationId: state.registration.registrationId,
      status: "CANCELLED",
      cancelledAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
      version: 3,
    });
  }),

  http.post("/api/office-registrations/:registrationId/reapplication-start", () => {
    if (!state.registration) return mockErrors.notFound();
    state.registration = { ...state.registration, resolved: true };
    return HttpResponse.json({
      registrationId: state.registration.registrationId,
      resolved: true,
    });
  }),

  http.get("/api/offices/current", () => HttpResponse.json(state.office)),

  http.patch("/api/offices/current", async ({ request }) => {
    const body = (await request.json()) as { representativePhone?: string };
    if (request.headers.get("If-Match") !== String(state.office.version)) {
      return mockErrors.versionConflict(state.office.version);
    }
    if (!body.representativePhone || !/^0\d{1,2}-\d{3,4}-\d{4}$/.test(body.representativePhone)) {
      return invalid("representativePhone", "INVALID_VALUE", "연락처 형식이 올바르지 않습니다.");
    }
    state.office = {
      ...state.office,
      representativePhone: body.representativePhone,
      version: state.office.version + 1,
    };
    return HttpResponse.json(state.office);
  }),

  http.post("/api/office-change-requests", async ({ request }) => {
    const body = (await request.json()) as {
      changeType: ChangeItem["changeType"];
      requestedValues: Record<string, unknown>;
    };
    const item: ChangeItem = {
      requestId: state.changeRequests.length + 1,
      changeType: body.changeType,
      requestedValues: body.requestedValues,
      status: "PENDING_REVIEW",
      rejectionReason: null,
      createdAt: NOW,
    };
    state.changeRequests = [item, ...state.changeRequests];
    return HttpResponse.json(
      {
        requestId: item.requestId,
        officeId: 12,
        changeType: body.changeType,
        requestedValues: body.requestedValues,
        status: "PENDING_REVIEW",
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/office-change-requests", ({ request }) =>
    HttpResponse.json(paged(state.changeRequests, new URL(request.url))),
  ),

  http.get("/api/offices/search", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const biz = params.get("businessRegistrationNumber");
    const name = params.get("name");
    const region = params.get("region");
    if (!biz && !(name && region)) {
      return invalid("name", "REQUIRED", "검색 조건을 입력해 주세요.");
    }
    const found = biz
      ? biz === "123-45-67890"
        ? state.searchable
        : []
      : state.searchable.filter(
          (item) => item.name.includes(name ?? "") && item.address.includes(region ?? ""),
        );
    return HttpResponse.json(paged(found, new URL(request.url)));
  }),

  http.post("/api/offices/:officeId/memberships", async ({ request, params }) => {
    const body = (await request.json()) as { role?: string; qualificationNumber?: string };
    if (params.officeId === "99") return mockErrors.notFound();
    if (params.officeId === "98") {
      return errorResponse(409, "PENDING_MEMBERSHIP_EXISTS", "이미 진행 중인 요청이 있습니다.");
    }
    if (body.role === "AGENT" && body.qualificationNumber === "형식오류") {
      return invalid(
        "qualificationNumber",
        "INVALID_VALUE",
        "자격증 번호 형식이 올바르지 않습니다.",
      );
    }
    state.myMembership = {
      membershipId: 41,
      officeId: Number(params.officeId),
      officeName: "땡땡사무소",
      role: body.role === "DEPUTY" ? "DEPUTY" : "AGENT",
      status: "PENDING",
      requestSource: "REQUEST",
      expiresAt: "2026-12-10T09:00:00+09:00",
      invitationAcceptedAt: null,
      rejectionReason: null,
      resolved: null,
      createdAt: NOW,
      updatedAt: NOW,
      version: 1,
    };
    return HttpResponse.json(
      {
        membershipId: 41,
        status: "PENDING",
        role: state.myMembership.role,
        officeId: Number(params.officeId),
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/memberships/me", () => {
    if (!state.myMembership) return mockErrors.notFound();
    return HttpResponse.json(state.myMembership);
  }),

  http.post("/api/memberships/:membershipId/cancel", ({ params }) => {
    if (state.myMembership) state.myMembership = { ...state.myMembership, status: "CANCELLED" };
    return HttpResponse.json({
      membershipId: Number(params.membershipId),
      status: "CANCELLED",
      role: "AGENT",
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: 2,
    });
  }),

  http.post("/api/memberships/:membershipId/reapplication-start", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      employmentReportConfirmed?: unknown;
      trainingConfirmed?: unknown;
    } | null;
    if (
      body === null ||
      typeof body.employmentReportConfirmed !== "boolean" ||
      typeof body.trainingConfirmed !== "boolean"
    ) {
      return invalid("employmentReportConfirmed", "REQUIRED", "필수 확인 항목이 없습니다.");
    }
    if (state.myMembership) {
      state.myMembership = {
        ...state.myMembership,
        membershipId: 42,
        status: "PENDING",
        rejectionReason: null,
        resolved: null,
      };
    }
    return HttpResponse.json(
      {
        membershipId: 42,
        status: "PENDING",
        officeId: 12,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.post("/api/memberships/:membershipId/accept-invitation", async ({ request, params }) => {
    const body = (await request.json()) as { qualificationNumber?: string };
    if (state.myMembership?.role === "AGENT" && body.qualificationNumber === "형식오류") {
      return invalid(
        "qualificationNumber",
        "INVALID_VALUE",
        "자격증 번호 형식이 올바르지 않습니다.",
      );
    }
    if (state.myMembership) {
      state.myMembership = {
        ...state.myMembership,
        invitationAcceptedAt: NOW,
        version: state.myMembership.version + 1,
      };
    }
    return HttpResponse.json({
      membershipId: Number(params.membershipId),
      invitationAcceptedAt: NOW,
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: 2,
    });
  }),

  http.get("/api/offices/current/memberships", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "APPROVED";
    return HttpResponse.json(
      paged(
        state.members.filter((item) => item.status === status),
        url,
      ),
    );
  }),

  http.get("/api/memberships/:membershipId", ({ params }) => {
    if (String(state.detail.membershipId) !== params.membershipId) return mockErrors.notFound();
    return HttpResponse.json(state.detail);
  }),

  http.post("/api/memberships/:membershipId/approve", ({ params }) => {
    const target = state.members.find((item) => String(item.membershipId) === params.membershipId);
    if (!target) return mockErrors.notFound();
    if (target.role === "DEPUTY" && target.displayName === "한도초과") {
      return errorResponse(409, "DEPUTY_QUOTA_EXCEEDED", "중개보조원 한도를 초과합니다.");
    }
    state.members = state.members.map((item) =>
      item === target ? { ...item, status: "APPROVED" as const } : item,
    );
    return HttpResponse.json({
      membershipId: target.membershipId,
      status: "APPROVED",
      role: target.role === "DEPUTY" ? "DEPUTY" : "AGENT",
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: 2,
    });
  }),

  http.post("/api/memberships/:membershipId/reject", ({ params }) => {
    state.members = state.members.filter(
      (item) => String(item.membershipId) !== params.membershipId,
    );
    return HttpResponse.json({
      membershipId: Number(params.membershipId),
      status: "REJECTED",
      role: "AGENT",
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: 2,
    });
  }),

  http.patch("/api/memberships/:membershipId/role", async ({ request, params }) => {
    const body = (await request.json()) as { role: "AGENT" | "DEPUTY" };
    if (request.headers.get("If-Match") !== String(state.detail.version)) {
      return mockErrors.versionConflict(state.detail.version);
    }
    state.detail = { ...state.detail, role: body.role, version: state.detail.version + 1 };
    return HttpResponse.json({
      membershipId: Number(params.membershipId),
      role: body.role,
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: state.detail.version,
    });
  }),

  http.post("/api/memberships/:membershipId/suspend", async ({ request, params }) => {
    const body = (await request.json()) as { reason?: string };
    if (!body.reason) return invalid("reason", "REQUIRED", "사유를 입력해 주세요.");
    state.detail = { ...state.detail, status: "SUSPENDED", version: state.detail.version + 1 };
    return HttpResponse.json({
      membershipId: Number(params.membershipId),
      status: "SUSPENDED",
      role: "AGENT",
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: state.detail.version,
    });
  }),

  http.post("/api/memberships/:membershipId/reinstate", ({ params }) => {
    state.detail = { ...state.detail, status: "APPROVED", version: state.detail.version + 1 };
    return HttpResponse.json({
      membershipId: Number(params.membershipId),
      status: "APPROVED",
      role: "AGENT",
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: state.detail.version,
    });
  }),

  http.delete("/api/memberships/:membershipId", () => new HttpResponse(null, { status: 204 })),

  http.post("/api/offices/current/memberships/invite", async ({ request }) => {
    const body = (await request.json()) as { email?: string; role?: "AGENT" | "DEPUTY" };
    if (body.email === "unknown@example.com") return mockErrors.notFound();
    if (body.email === "member@example.com") {
      return errorResponse(409, "PENDING_MEMBERSHIP_EXISTS", "이미 소속된 사용자입니다.");
    }
    state.members = [
      ...state.members,
      member({
        membershipId: 60 + state.members.length,
        displayName: "초대받은분",
        role: body.role ?? "AGENT",
        status: "PENDING",
        requestSource: "INVITE",
        approvedAt: null,
        expiresAt: LATER,
        invitationAcceptedAt: null,
        qualificationNumber: null,
        employmentReportConfirmed: null,
        trainingConfirmed: null,
        billable: false,
      }),
    ];
    return HttpResponse.json({
      membershipId: 60,
      status: "PENDING",
      role: body.role ?? "AGENT",
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: 1,
      expiresAt: LATER,
    });
  }),

  http.post("/api/memberships/:membershipId/invitation/cancel", ({ params }) => {
    state.members = state.members.filter(
      (item) => String(item.membershipId) !== params.membershipId,
    );
    return HttpResponse.json({
      membershipId: Number(params.membershipId),
      status: "CANCELLED",
      role: "AGENT",
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: 2,
    });
  }),

  http.post("/api/memberships/:membershipId/invitation/resend", ({ params }) =>
    HttpResponse.json({
      membershipId: Number(params.membershipId),
      status: "PENDING",
      expiresAt: LATER,
      updatedAt: NOW,
      version: 3,
    }),
  ),

  http.get("/api/offices/current/employment-roster", ({ request }) =>
    HttpResponse.json({ quota: state.quota, ...paged(state.roster, new URL(request.url)) }),
  ),

  http.post("/api/offices/current/employment-roster", async ({ request }) => {
    const body = (await request.json()) as Omit<
      RosterItem,
      | "rosterId"
      | "officeId"
      | "createdAt"
      | "updatedAt"
      | "version"
      | "employmentEndDate"
      | "membershipId"
    >;
    if (body.personName === "형식오류") {
      return invalid("personName", "INVALID_VALUE", "이름 형식이 올바르지 않습니다.");
    }
    const officeVersion = bumpOfficeVersion();
    const item: RosterItem = {
      rosterId: state.roster.length + 1,
      officeId: 12,
      membershipId: null,
      employmentEndDate: null,
      createdAt: NOW,
      updatedAt: NOW,
      version: officeVersion,
      ...body,
    };
    state.roster = [...state.roster.map((row) => ({ ...row, version: officeVersion })), item];
    return HttpResponse.json(item, { status: 201 });
  }),

  http.patch("/api/offices/current/employment-roster/:rosterId", async ({ request, params }) => {
    const body = (await request.json()) as {
      employmentEndDate?: string | null;
      legalQualification?: "AGENT" | "DEPUTY";
    };
    const target = state.roster.find((item) => String(item.rosterId) === params.rosterId);
    if (!target) return mockErrors.notFound();
    if (request.headers.get("If-Match") !== String(state.office.version)) {
      return mockErrors.versionConflict(state.office.version);
    }
    const officeVersion = bumpOfficeVersion();
    const updated: RosterItem = {
      ...target,
      ...(body.employmentEndDate !== undefined
        ? { employmentEndDate: body.employmentEndDate }
        : {}),
      ...(body.legalQualification ? { legalQualification: body.legalQualification } : {}),
      version: officeVersion,
    };
    state.roster = state.roster.map((item) =>
      item === target ? updated : { ...item, version: officeVersion },
    );
    return HttpResponse.json({
      ...updated,
      ...(state.quota.exceeded ? { warning: "DEPUTY_QUOTA_EXCEEDED" } : {}),
    });
  }),

  http.get("/api/offices/current/owner-transfer", () =>
    state.transfer ? HttpResponse.json(state.transfer) : mockErrors.notFound(),
  ),

  http.post("/api/offices/current/owner-transfer", async ({ request }) => {
    const body = (await request.json()) as { toUserId: number };
    if (state.transfer) {
      return errorResponse(409, "TRANSFER_IN_PROGRESS", "진행 중인 이전이 있습니다.");
    }
    state.transfer = {
      transferId: 70,
      officeId: 12,
      fromDisplayName: "김대표",
      toDisplayName: body.toUserId === 102 ? "이중개" : "후보",
      status: "PENDING",
      requestedAt: NOW,
      acceptDeadlineAt: LATER,
      acceptedAt: null,
      updatedAt: NOW,
      version: 1,
    };
    return HttpResponse.json(
      {
        transferId: 70,
        officeId: 12,
        status: "PENDING",
        requestedAt: NOW,
        acceptDeadlineAt: LATER,
        acceptedAt: null,
        completedAt: null,
        withdrawnAt: null,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/owner-transfers/:transferId", ({ params }) =>
    HttpResponse.json({
      transferId: Number(params.transferId),
      officeId: 12,
      fromDisplayName: "김대표",
      toDisplayName: "이중개",
      status: state.transfer === null ? "WITHDRAWN" : state.transfer.status,
      rejectionReason: null,
      rejectedAt: null,
      requestedAt: NOW,
      acceptDeadlineAt: LATER,
      acceptedAt: null,
      completedAt: null,
      withdrawnAt: NOW,
      updatedAt: NOW,
      version: 2,
    }),
  ),

  http.post("/api/owner-transfers/:transferId/accept", ({ params }) => {
    if (state.transfer) {
      state.transfer = { ...state.transfer, status: "UNDER_REVIEW", acceptedAt: NOW };
    }
    return HttpResponse.json({ transferId: Number(params.transferId), status: "UNDER_REVIEW" });
  }),

  http.post("/api/owner-transfers/:transferId/reject", ({ params }) => {
    state.transfer = null;
    return HttpResponse.json({
      transferId: Number(params.transferId),
      status: "REJECTED",
      rejectedAt: NOW,
    });
  }),

  http.post("/api/owner-transfers/:transferId/withdraw", ({ params }) => {
    state.transfer = null;
    return HttpResponse.json({
      transferId: Number(params.transferId),
      officeId: 12,
      status: "WITHDRAWN",
      requestedAt: NOW,
      acceptDeadlineAt: LATER,
      acceptedAt: null,
      completedAt: null,
      withdrawnAt: NOW,
      updatedAt: NOW,
      version: 2,
    });
  }),
];
