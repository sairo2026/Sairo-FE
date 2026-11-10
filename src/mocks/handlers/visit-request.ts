import { http, HttpResponse } from "msw";
import type {
  ApplyGrantResponse,
  CrossOfficeRequestListResponse,
  CrossOfficeScheduleListResponse,
  VisitRequestNoticeListResponse,
  VisitRequestResponse,
} from "@/lib/api/contracts/visit.schema";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockPropertyState } from "./property";
import { getMockVisitState, setMockVisitState } from "./visit";
import type { MockCoordination } from "./visit";

const NOW = "2026-11-10T09:00:00+09:00";
const ACTIVE = ["PENDING", "SELECTED"];
const SUBMITTABLE = ["FINAL_CONFIRMATION_REQUIRED", "APPLYING"];

export type MockOfficeRequest = VisitRequestResponse;
export type MockNotice = VisitRequestNoticeListResponse["items"][number];
export type MockApplyGrant = ApplyGrantResponse;
export type MockCrossRequest = CrossOfficeRequestListResponse["items"][number];
export type MockCrossSchedule = CrossOfficeScheduleListResponse["items"][number];

export type VisitRequestMockState = {
  requests: MockOfficeRequest[];
  notices: MockNotice[];
  grants: MockApplyGrant[];
  crossRequests: MockCrossRequest[];
  crossSchedules: MockCrossSchedule[];
  quotaScope: "MEMBERSHIP" | "APPROVAL" | null;
  rateLimited: boolean;
  violatedRules: string[] | null;
  invalidGranteeOfficeIds: number[];
  nextId: number;
};

export function buildMockOfficeRequest(
  partial: Partial<MockOfficeRequest> & Pick<MockOfficeRequest, "requestId">,
): MockOfficeRequest {
  return {
    conditionId: 801,
    approvalId: 7001,
    propertyId: 501,
    propertyOfficeId: 12,
    crossOffice: false,
    accessGrantId: null,
    applicantOfficeId: 12,
    applicantMembershipId: 2,
    coordinationId: 801,
    candidatePropertyId: 8011,
    requestKind: "NEW",
    replacesScheduleItemId: null,
    requestedStartAt: "2026-11-12T10:00:00+09:00",
    requestedEndAt: "2026-11-12T10:30:00+09:00",
    expectedDurationMinutes: 30,
    partySize: 2,
    requestNote: null,
    status: "PENDING",
    statusReason: null,
    submittedAt: NOW,
    closedAt: null,
    updatedAt: NOW,
    version: 1,
    ...partial,
  };
}

export function buildMockApplyGrant(
  partial: Partial<MockApplyGrant> & Pick<MockApplyGrant, "grantId">,
): MockApplyGrant {
  return {
    approvalId: 7001,
    propertyId: 501,
    ownerOfficeId: 12,
    granteeOfficeId: 31,
    granteeOfficeName: "정릉부동산",
    granteeMembershipId: null,
    granteeMemberName: null,
    scope: "OFFICE",
    grantedByMembershipId: 1,
    grantedByName: "김대표",
    grantedAt: NOW,
    expiresAt: null,
    revokedAt: null,
    revokeSource: null,
    revokeReason: null,
    state: "ACTIVE",
    openRequestCount: 0,
    ...partial,
  };
}

function initialState(): VisitRequestMockState {
  return {
    requests: [],
    notices: [],
    grants: [],
    crossRequests: [],
    crossSchedules: [],
    quotaScope: null,
    rateLimited: false,
    violatedRules: null,
    invalidGranteeOfficeIds: [12, 98],
    nextId: 9500,
  };
}

let state = initialState();

export function resetMockVisitRequestState(): void {
  state = initialState();
}

export function getMockVisitRequestState(): VisitRequestMockState {
  return state;
}

export function setMockVisitRequestState(partial: Partial<VisitRequestMockState>): void {
  state = { ...state, ...partial };
}

function isDeputy(): boolean {
  return getMockVisitState().callerRole === "DEPUTY";
}

function deniedForDeputy() {
  return isDeputy() ? mockErrors.forbidden() : null;
}

function updateCoordination(
  coordinationId: number,
  changes: Partial<MockCoordination>,
): MockCoordination | undefined {
  const visit = getMockVisitState();
  const found = visit.coordinations.find((item) => item.coordinationId === coordinationId);
  if (!found) return undefined;
  const next = { ...found, ...changes, version: found.version + 1, updatedAt: NOW };
  setMockVisitState({
    coordinations: visit.coordinations.map((item) =>
      item.coordinationId === coordinationId ? next : item,
    ),
  });
  return next;
}

function recomputeStatus(coordinationId: number) {
  const visit = getMockVisitState();
  const found = visit.coordinations.find((item) => item.coordinationId === coordinationId);
  if (!found || !["APPLYING", "FINAL_CONFIRMATION_REQUIRED"].includes(found.status)) return;
  const hasActive = state.requests.some(
    (item) => item.coordinationId === coordinationId && ACTIVE.includes(item.status),
  );
  const status = hasActive ? "APPLYING" : "FINAL_CONFIRMATION_REQUIRED";
  if (status !== found.status) updateCoordination(coordinationId, { status });
}

function pushNotice(requestId: number, noticeType: string) {
  state.notices = [
    {
      noticeId: state.nextId++,
      requestId,
      noticeType,
      channel: "IN_APP",
      createdAt: NOW,
      readAt: null,
    },
    ...state.notices,
  ];
}

type SubmitBody = {
  candidatePropertyId?: number;
  requestedStartAt: string;
  requestedEndAt: string;
  expectedDurationMinutes: number;
  partySize?: number | null;
  requestNote?: string | null;
};

function validateBody(body: SubmitBody) {
  const start = Date.parse(body.requestedStartAt);
  const end = Date.parse(body.requestedEndAt);
  const fieldErrors: Array<{ field: string; message: string }> = [];
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    fieldErrors.push({
      field: "requestedEndAt",
      message: "종료 시각은 시작 시각보다 늦어야 합니다.",
    });
  }
  if (!Number.isInteger(body.expectedDurationMinutes) || body.expectedDurationMinutes < 1) {
    fieldErrors.push({ field: "expectedDurationMinutes", message: "소요시간을 입력해 주세요." });
  }
  return fieldErrors;
}

type Candidate = MockCoordination["candidateProperties"][number];

function submissionFailure(body: SubmitBody, candidate: Candidate) {
  if (candidate.crossOffice && candidate.grantState !== "ACTIVE") {
    return errorResponse(403, "APPLY_GRANT_INACTIVE", "신청 허용이 회수되었거나 만료되었습니다.");
  }
  const fieldErrors = validateBody(body);
  if (fieldErrors.length > 0) return mockErrors.validation(fieldErrors);
  const duplicate = state.requests.some(
    (item) =>
      item.candidatePropertyId === candidate.candidatePropertyId && ACTIVE.includes(item.status),
  );
  if (duplicate) {
    return errorResponse(
      409,
      "VISIT_REQUEST_DUPLICATE_ACTIVE",
      "이 후보 매물에는 신청 대기 중인 신청이 이미 있습니다.",
    );
  }
  if (state.rateLimited) return mockErrors.rateLimited(30);
  if (state.quotaScope) {
    return errorResponse(429, "VISIT_REQUEST_QUOTA_EXCEEDED", "동시 신청 한도를 넘었습니다.", {
      quotaScope: state.quotaScope,
      limit: state.quotaScope === "APPROVAL" ? 10 : 40,
      current: state.quotaScope === "APPROVAL" ? null : 40,
    });
  }
  if (state.violatedRules) {
    return errorResponse(422, "APPROVER_CONDITION_VIOLATED", "승인자 조건에 맞지 않습니다.", {
      violatedRules: state.violatedRules,
    });
  }
  const start = Date.parse(body.requestedStartAt);
  const end = Date.parse(body.requestedEndAt);
  const inside = candidate.applicableSlots.some(
    (slot) => Date.parse(slot.startsAt) <= start && end <= Date.parse(slot.endsAt),
  );
  if (!inside) {
    return errorResponse(422, "APPROVER_CONDITION_VIOLATED", "신청 구간이 맞지 않습니다.", {
      violatedRules: ["WINDOW_MISMATCH"],
    });
  }
  return null;
}

function createRequest(
  coordination: MockCoordination,
  candidate: Candidate,
  body: SubmitBody,
  kind: "NEW" | "CHANGE",
  replacesScheduleItemId: number | null,
): MockOfficeRequest {
  const visit = getMockVisitState();
  const approval =
    visit.approvals.find((item) => item.propertyId === candidate.propertyId && !item.revokedAt) ??
    null;
  const created = buildMockOfficeRequest({
    requestId: state.nextId++,
    approvalId: approval?.approvalId ?? 7001,
    propertyId: candidate.propertyId,
    propertyOfficeId: candidate.ownerOfficeId,
    crossOffice: candidate.crossOffice,
    accessGrantId: candidate.grantId ?? null,
    coordinationId: coordination.coordinationId,
    candidatePropertyId: candidate.candidatePropertyId,
    requestKind: kind,
    replacesScheduleItemId,
    requestedStartAt: body.requestedStartAt,
    requestedEndAt: body.requestedEndAt,
    expectedDurationMinutes: body.expectedDurationMinutes,
    partySize: body.partySize ?? null,
    requestNote: body.requestNote ?? null,
  });
  state.requests = [created, ...state.requests];
  return created;
}

function pageOf<T>(items: T[], url: URL) {
  const page = Number(url.searchParams.get("page") ?? 0);
  const size = Number(url.searchParams.get("size") ?? 25);
  return {
    items: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
  };
}

function findOwnProperty(propertyId: string | readonly string[] | undefined) {
  return getMockPropertyState().properties.find(
    (item) => String(item.propertyId) === String(propertyId),
  );
}

export const visitRequestHandlers = [
  http.post("/api/visit-coordinations/:id/visit-requests", async ({ params, request }) => {
    const denied = deniedForDeputy();
    if (denied) return denied;
    const coordination = getMockVisitState().coordinations.find(
      (item) => String(item.coordinationId) === params.id,
    );
    if (!coordination) return mockErrors.notFound();
    const body = (await request.json()) as SubmitBody;
    const candidate = coordination.candidateProperties.find(
      (item) => item.candidatePropertyId === body.candidatePropertyId,
    );
    if (!candidate) return mockErrors.notFound();
    if (!SUBMITTABLE.includes(coordination.status)) {
      return errorResponse(
        409,
        "INVALID_TRANSITION",
        "지금은 신규 신청을 받을 수 없는 상태입니다.",
      );
    }
    const failure = submissionFailure(body, candidate);
    if (failure) return failure;
    const created = createRequest(coordination, candidate, body, "NEW", null);
    updateCoordination(coordination.coordinationId, { status: "APPLYING" });
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get("/api/visit-coordinations/:id/visit-requests", ({ params }) => {
    const coordination = getMockVisitState().coordinations.find(
      (item) => String(item.coordinationId) === params.id,
    );
    if (!coordination) return mockErrors.notFound();
    const items = state.requests
      .filter((item) => item.coordinationId === coordination.coordinationId)
      .map((item) => ({
        requestId: item.requestId,
        propertyId: item.propertyId,
        propertyOfficeId: item.propertyOfficeId,
        crossOffice: item.crossOffice,
        accessGrantId: item.accessGrantId,
        candidatePropertyId: item.candidatePropertyId,
        status: item.status,
        requestedStartAt: item.requestedStartAt,
        requestedEndAt: item.requestedEndAt,
        submittedAt: item.submittedAt,
        closedAt: item.closedAt,
        statusReason: item.statusReason,
        version: item.version,
        requestKind: item.requestKind,
      }));
    return HttpResponse.json({ items });
  }),

  http.get("/api/visit-requests/:requestId", ({ params }) => {
    const found = state.requests.find((item) => String(item.requestId) === params.requestId);
    if (!found) return mockErrors.notFound();
    return HttpResponse.json({
      propertyOfficeId: found.propertyOfficeId,
      crossOffice: found.crossOffice,
      accessGrantId: found.accessGrantId,
      statusHistory: [
        {
          fromStatus: null,
          toStatus: "PENDING",
          source: "BROKER",
          reason: null,
          effectiveAt: found.submittedAt,
        },
      ],
      selections: [],
      revalidations: [],
    });
  }),

  http.post("/api/visit-requests/:requestId/withdraw", ({ params, request }) => {
    const denied = deniedForDeputy();
    if (denied) return denied;
    const found = state.requests.find((item) => String(item.requestId) === params.requestId);
    if (!found) return mockErrors.notFound();
    const header = request.headers.get("If-Match");
    if (header === null || Number.isNaN(Number(header))) {
      return mockErrors.validation([{ field: "If-Match", message: "신청 버전이 필요합니다." }]);
    }
    if (Number(header) !== found.version) return mockErrors.versionConflict(found.version);
    if (found.status !== "PENDING") {
      return errorResponse(
        409,
        "VISIT_REQUEST_INVALID_STATE",
        "현재 신청 상태에서는 철회할 수 없습니다.",
      );
    }
    const next = {
      ...found,
      status: "WITHDRAWN",
      closedAt: NOW,
      updatedAt: NOW,
      version: found.version + 1,
    };
    state.requests = state.requests.map((item) => (item === found ? next : item));
    recomputeStatus(found.coordinationId);
    return HttpResponse.json(next);
  }),

  http.post("/api/visit-schedule-items/:itemId/change-requests", async ({ params, request }) => {
    const denied = deniedForDeputy();
    if (denied) return denied;
    const coordination = getMockVisitState().coordinations.find((item) =>
      (item.scheduleItems ?? []).some((entry) => String(entry.itemId) === params.itemId),
    );
    const item = coordination?.scheduleItems?.find(
      (entry) => String(entry.itemId) === params.itemId,
    );
    if (!coordination || !item) return mockErrors.notFound();
    const candidate = coordination.candidateProperties.find(
      (entry) => entry.candidatePropertyId === item.candidatePropertyId,
    );
    if (!candidate) return mockErrors.notFound();
    const body = (await request.json()) as SubmitBody;
    if (item.result !== "SCHEDULED") {
      return errorResponse(
        409,
        "VISIT_REQUEST_INVALID_STATE",
        "예정 상태의 확정 방문만 변경할 수 있습니다.",
      );
    }
    const failure = submissionFailure(body, candidate);
    if (failure) return failure;
    const created = createRequest(coordination, candidate, body, "CHANGE", item.itemId);
    pushNotice(created.requestId, "REAPPROVAL_REQUESTED");
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get("/api/visit-request-notices", () => HttpResponse.json({ items: state.notices })),

  http.post("/api/visit-request-notices/:noticeId/read", ({ params }) => {
    const found = state.notices.find((item) => String(item.noticeId) === params.noticeId);
    if (!found) return mockErrors.notFound();
    state.notices = state.notices.map((item) => (item === found ? { ...item, readAt: NOW } : item));
    return HttpResponse.json({});
  }),

  http.get(
    "/api/properties/:propertyId/access-approvals/:approvalId/apply-grants",
    ({ params, request }) => {
      const denied = deniedForDeputy();
      if (denied) return denied;
      const approval = getMockVisitState().approvals.find(
        (item) => String(item.approvalId) === params.approvalId,
      );
      if (!approval || String(approval.propertyId) !== params.propertyId) {
        return mockErrors.notFound();
      }
      const items = state.grants.filter((item) => item.approvalId === approval.approvalId);
      return HttpResponse.json(pageOf(items, new URL(request.url)));
    },
  ),

  http.post(
    "/api/properties/:propertyId/access-approvals/:approvalId/apply-grants",
    async ({ params, request }) => {
      const denied = deniedForDeputy();
      if (denied) return denied;
      const approval = getMockVisitState().approvals.find(
        (item) => String(item.approvalId) === params.approvalId,
      );
      if (!approval || String(approval.propertyId) !== params.propertyId) {
        return mockErrors.notFound();
      }
      if (approval.approvalRole !== "PRIMARY" || approval.revokedAt) {
        return errorResponse(
          409,
          "INVALID_TRANSITION",
          "대표 승인자 출입승인에만 허용할 수 있습니다.",
        );
      }
      const body = (await request.json()) as {
        granteeOfficeId: number;
        granteeMembershipId?: number | null;
        expiresAt?: string | null;
      };
      if (state.invalidGranteeOfficeIds.includes(body.granteeOfficeId)) {
        return errorResponse(422, "APPLY_GRANT_TARGET_INVALID", "허용할 수 없는 대상입니다.");
      }
      const duplicate = state.grants.some(
        (item) =>
          item.approvalId === approval.approvalId &&
          item.state === "ACTIVE" &&
          item.granteeOfficeId === body.granteeOfficeId &&
          (item.granteeMembershipId ?? null) === (body.granteeMembershipId ?? null),
      );
      if (duplicate) {
        return errorResponse(
          409,
          "APPLY_GRANT_DUPLICATE_ACTIVE",
          "이미 적용 중인 허용이 있습니다.",
        );
      }
      const created = buildMockApplyGrant({
        grantId: state.nextId++,
        approvalId: approval.approvalId,
        propertyId: approval.propertyId,
        granteeOfficeId: body.granteeOfficeId,
        granteeOfficeName:
          body.granteeOfficeId === 31 ? "정릉부동산" : `사무소 ${body.granteeOfficeId}`,
        granteeMembershipId: body.granteeMembershipId ?? null,
        granteeMemberName: body.granteeMembershipId ? "박중개" : null,
        scope: body.granteeMembershipId ? "MEMBER" : "OFFICE",
        expiresAt: body.expiresAt ?? null,
      });
      state.grants = [created, ...state.grants];
      return HttpResponse.json(created, { status: 201 });
    },
  ),

  http.post(
    "/api/properties/:propertyId/access-approvals/:approvalId/apply-grants/:grantId/revoke",
    async ({ params, request }) => {
      const denied = deniedForDeputy();
      if (denied) return denied;
      const grant = state.grants.find((item) => String(item.grantId) === params.grantId);
      if (!grant) return mockErrors.notFound();
      const body = (await request.json()) as { reason?: string };
      if (!body.reason || body.reason.trim() === "") {
        return mockErrors.validation([{ field: "reason", message: "회수 사유를 입력해 주세요." }]);
      }
      if (grant.state !== "ACTIVE") {
        return errorResponse(409, "INVALID_TRANSITION", "적용 중인 허용만 회수할 수 있습니다.");
      }
      const closed = state.requests.filter(
        (item) => item.accessGrantId === grant.grantId && item.status === "PENDING",
      );
      const closedIds = closed.map((item) => item.requestId);
      state.requests = state.requests.map((item) =>
        closedIds.includes(item.requestId)
          ? { ...item, status: "EXPIRED", closedAt: NOW, statusReason: "GRANT_REVOKED" }
          : item,
      );
      const next = {
        ...grant,
        state: "REVOKED" as const,
        revokedAt: NOW,
        revokeSource: "OFFICE" as const,
        revokeReason: body.reason.trim(),
        openRequestCount: 0,
      };
      state.grants = state.grants.map((item) => (item === grant ? next : item));
      for (const id of closedIds) pushNotice(id, "GRANT_REVOKED");
      return HttpResponse.json({
        grant: next,
        closedRequestIds: closedIds,
        keptScheduleItemIds: [],
      });
    },
  ),

  http.get("/api/properties/:propertyId/cross-office-requests", ({ params, request }) => {
    const denied = deniedForDeputy();
    if (denied) return denied;
    if (!findOwnProperty(params.propertyId)) return mockErrors.notFound();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const items = status
      ? state.crossRequests.filter((item) => status.split(",").includes(item.status))
      : state.crossRequests;
    return HttpResponse.json(pageOf(items, url));
  }),

  http.get("/api/properties/:propertyId/cross-office-schedules", ({ params, request }) => {
    const denied = deniedForDeputy();
    if (denied) return denied;
    if (!findOwnProperty(params.propertyId)) return mockErrors.notFound();
    return HttpResponse.json(pageOf(state.crossSchedules, new URL(request.url)));
  }),
];
