import { http, HttpResponse } from "msw";
import type {
  ApproverPortalApprovalListResponse,
  ApproverConditionResponse,
  ApproverConfirmedScheduleResponse,
  ApproverConditionImpactPreviewResponse,
} from "@/lib/api/contracts/visit.schema";
import type { ApproverCompareItem } from "@/features/visit/api/approver.api";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockVisitState } from "./visit";

const NOW = "2026-11-10T09:00:00+09:00";
const NOTICE_VERSION = "2026-11";

export const MOCK_PRIMARY_TOKEN = "NzAwMToxNzYyNzM2NDAwMDAw.approver-token-primary-0001";
export const MOCK_CO_APPROVER_TOKEN = "approver-token-coapprover-0001";
export const MOCK_EXPIRED_TOKEN = "approver-token-expired-0000001";

export type MockTokenInfo = { approvalId: number; role: "PRIMARY" | "CO_APPROVER" };
export type MockCondition = Omit<
  ApproverConditionResponse,
  "normalizedRanges" | "normalizationApplied" | "privacyNotice"
>;
export type MockRequest = ApproverCompareItem & { approvalId: number; version: number };
export type MockConfirmed = ApproverConfirmedScheduleResponse["items"][number] & {
  approvalId: number;
};

export type MockPortalApproval = ApproverPortalApprovalListResponse["items"][number];

export type ApproverMockState = {
  portalSession: boolean;
  portalApprovals: MockPortalApproval[];
  tokens: Record<string, MockTokenInfo>;
  expiredTokens: string[];
  conditions: MockCondition[];
  requests: MockRequest[];
  confirmed: MockConfirmed[];
  impactItems: ApproverConditionImpactPreviewResponse["affectedItems"];
  revalidationFailure: { code: string; detail: string } | null;
  noticeVersion: string;
  nextId: number;
};

export function buildMockCondition(
  partial: Partial<MockCondition> & Pick<MockCondition, "approvalId">,
): MockCondition {
  return {
    conditionId: 801,
    versionNo: 1,
    status: "ACTIVE",
    appliesFrom: "2026-11-10T00:00:00+09:00",
    appliesUntil: "2026-12-31T23:59:59+09:00",
    maxVisitsPerDay: 3,
    minGapMinutes: 30,
    minLeadMinutes: null,
    singleVisitMaxMinutes: null,
    groupingPreference: null,
    source: "DIRECT",
    windows: [
      {
        windowType: "WEEKDAY",
        weekday: 3,
        windowDate: null,
        startsTime: "10:00",
        endsTime: "12:00",
        isException: false,
      },
    ],
    registeredAt: NOW,
    supersededAt: null,
    dateRules: [],
    dateRuleReplacedCount: 0,
    enteredViaProfile: false,
    ...partial,
  };
}

export function buildMockRequest(
  partial: Partial<MockRequest> & Pick<MockRequest, "requestId">,
): MockRequest {
  return {
    approvalId: 7001,
    requestKind: "NEW",
    status: "PENDING",
    applicantOfficeName: "사이로공인중개사",
    applicantBrokerName: "김중개",
    applicantRelation: "OWNER_OFFICE",
    requestedStartAt: "2026-11-18T10:00:00+09:00",
    requestedEndAt: "2026-11-18T10:30:00+09:00",
    expectedDurationMinutes: 30,
    partySize: 2,
    requestNote: "오전 방문을 원합니다",
    submittedAt: NOW,
    applicantHistory: { previousCompletedVisitCount: 2, previousCancelledVisitCount: 0 },
    isPreferredBroker: false,
    applicantTrust: null,
    version: 1,
    ...partial,
  };
}

function initialState(): ApproverMockState {
  return {
    tokens: {
      [MOCK_PRIMARY_TOKEN]: { approvalId: 7001, role: "PRIMARY" },
      [MOCK_CO_APPROVER_TOKEN]: { approvalId: 7002, role: "CO_APPROVER" },
      [MOCK_EXPIRED_TOKEN]: { approvalId: 7001, role: "PRIMARY" },
    },
    expiredTokens: [MOCK_EXPIRED_TOKEN],
    conditions: [buildMockCondition({ approvalId: 7001 })],
    requests: [
      buildMockRequest({ requestId: 9001 }),
      buildMockRequest({
        requestId: 9002,
        applicantOfficeName: "정릉부동산",
        applicantBrokerName: "박중개",
        applicantRelation: "GRANTED_OFFICE",
        requestedStartAt: "2026-11-18T10:15:00+09:00",
        requestedEndAt: "2026-11-18T10:45:00+09:00",
        isPreferredBroker: true,
        applicantTrust: {
          state: "AVAILABLE",
          overallBand: "HIGH",
          completedVisitCount: 6,
          evaluatedVisitCount: 4,
          distinctApproverCount: 3,
          indicators: [
            { indicator: "PUNCTUALITY", answeredCount: 4, yesCount: 4, band: "HIGH" },
            { indicator: "ADVANCE_CONTACT", answeredCount: 4, yesCount: 3, band: "MID" },
            { indicator: "AS_REQUESTED", answeredCount: 4, yesCount: 4, band: "HIGH" },
          ],
        },
      }),
    ],
    confirmed: [],
    portalSession: false,
    portalApprovals: [],
    impactItems: [],
    revalidationFailure: null,
    noticeVersion: NOTICE_VERSION,
    nextId: 9100,
  };
}

let state = initialState();

export function resetMockApproverState(): void {
  state = initialState();
}

export function getMockApproverState(): ApproverMockState {
  return state;
}

export function setMockApproverState(partial: Partial<ApproverMockState>): void {
  state = { ...state, ...partial };
}

export type Resolved = { kind: "ok"; info: MockTokenInfo } | { kind: "error"; response: Response };

export type ApproverResolver = (key: string | readonly string[] | undefined) => Resolved;

function resolve(token: string | readonly string[] | undefined): Resolved {
  const key = String(token);
  const info = state.tokens[key];
  if (!info) {
    return {
      kind: "error",
      response: errorResponse(404, "PUBLIC_LINK_NOT_FOUND", "링크를 찾을 수 없습니다."),
    };
  }
  if (state.expiredTokens.includes(key)) {
    return {
      kind: "error",
      response: errorResponse(404, "PUBLIC_LINK_EXPIRED", "링크가 만료되었습니다."),
    };
  }
  return { kind: "ok", info };
}

export const linkResolver: ApproverResolver = resolve;

export const portalResolver: ApproverResolver = (key) => {
  if (!state.portalSession) {
    return {
      kind: "error",
      response: errorResponse(401, "UNAUTHENTICATED", "세션이 만료되었습니다."),
    };
  }
  const approval = state.portalApprovals.find(
    (item) => String(item.approvalId) === String(key) && item.linkState === "LINKED",
  );
  if (!approval) return { kind: "error", response: mockErrors.notFound() };
  return { kind: "ok", info: { approvalId: approval.approvalId, role: approval.approvalRole } };
};

function conditionOwnerId(info: MockTokenInfo): number {
  if (info.role === "PRIMARY") return info.approvalId;
  return 7001;
}

function activeCondition(approvalId: number): MockCondition | undefined {
  return state.conditions.find(
    (item) => item.approvalId === approvalId && item.status === "ACTIVE",
  );
}

function withNotice(condition: MockCondition): ApproverConditionResponse {
  return {
    ...condition,
    normalizedRanges: [],
    normalizationApplied: false,
    privacyNotice: {
      noticeCode: "GUEST_LINK_NOTICE_APPROVER",
      noticeVersion: state.noticeVersion,
      retentionDays: 365,
    },
  };
}

type WindowBody = ApproverConditionResponse["windows"][number];

function normalizeWindows(windows: WindowBody[]): { merged: WindowBody[]; changed: boolean } {
  const groups = new Map<string, WindowBody[]>();
  for (const window of windows) {
    const key = `${window.windowType}-${window.weekday ?? window.windowDate}-${window.isException}`;
    groups.set(key, [...(groups.get(key) ?? []), window]);
  }
  const merged: WindowBody[] = [];
  let changed = false;
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.startsTime.localeCompare(b.startsTime));
    let current: WindowBody | undefined;
    for (const window of sorted) {
      if (current && window.startsTime <= current.endsTime) {
        changed = true;
        if (window.endsTime > current.endsTime) current = { ...current, endsTime: window.endsTime };
      } else {
        if (current) merged.push(current);
        current = window;
      }
    }
    if (current) merged.push(current);
  }
  return { merged, changed };
}

type UpsertBody = {
  appliesFrom: string;
  appliesUntil: string;
  windows: WindowBody[];
  dateRules?: unknown[] | null;
  impactAcknowledged: boolean;
  acknowledgedNoticeVersion: string;
  maxVisitsPerDay?: number | null;
  minGapMinutes?: number | null;
  minLeadMinutes?: number | null;
  singleVisitMaxMinutes?: number | null;
  groupingPreference?: "CONSECUTIVE" | "SPREAD" | null;
};

function validateUpsert(body: UpsertBody) {
  if (Date.parse(body.appliesUntil) <= Date.parse(body.appliesFrom)) {
    return mockErrors.validation([
      { field: "appliesUntil", message: "적용 종료는 시작보다 늦어야 합니다." },
    ]);
  }
  if (
    body.maxVisitsPerDay !== null &&
    body.maxVisitsPerDay !== undefined &&
    (body.maxVisitsPerDay < 1 || body.maxVisitsPerDay > 20)
  ) {
    return mockErrors.validation([
      { field: "maxVisitsPerDay", message: "1 이상 20 이하여야 합니다." },
    ]);
  }
  return null;
}

function createVersion(approvalId: number, body: UpsertBody, source: "DIRECT" | "PROXY") {
  const { merged, changed } = normalizeWindows(body.windows);
  const previous = state.conditions.filter((item) => item.approvalId === approvalId);
  state.conditions = state.conditions.map((item) =>
    item.approvalId === approvalId && item.status === "ACTIVE"
      ? { ...item, status: "SUPERSEDED" as const, supersededAt: NOW }
      : item,
  );
  const created = buildMockCondition({
    approvalId,
    conditionId: state.nextId++,
    versionNo: previous.length + 1,
    appliesFrom: body.appliesFrom,
    appliesUntil: body.appliesUntil,
    maxVisitsPerDay: body.maxVisitsPerDay ?? null,
    minGapMinutes: body.minGapMinutes ?? null,
    minLeadMinutes: body.minLeadMinutes ?? null,
    singleVisitMaxMinutes: body.singleVisitMaxMinutes ?? null,
    groupingPreference: body.groupingPreference ?? null,
    source,
    windows: merged,
    dateRules: body.dateRules ?? [],
    registeredAt: NOW,
  });
  state.conditions = [...state.conditions, created];
  return {
    ...withNotice(created),
    normalizationApplied: changed,
    normalizedRanges: changed ? merged : [],
  };
}

function pendingRequests(approvalId: number) {
  return state.requests.filter(
    (item) => item.approvalId === approvalId && item.status === "PENDING",
  );
}

function overlaps(a: MockRequest, b: MockRequest): boolean {
  return (
    Date.parse(a.requestedStartAt) < Date.parse(b.requestedEndAt) &&
    Date.parse(b.requestedStartAt) < Date.parse(a.requestedEndAt)
  );
}

function approverHandlers(prefix: string, resolver: ApproverResolver) {
  return [
    http.get(`${prefix}/conditions`, ({ params }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      const condition = activeCondition(conditionOwnerId(resolved.info));
      if (!condition) return errorResponse(404, "RESOURCE_NOT_FOUND", "활성 조건이 없습니다.");
      return HttpResponse.json(withNotice(condition));
    }),

    http.post(`${prefix}/conditions/impact-preview`, ({ params }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      if (resolved.info.role === "CO_APPROVER")
        return errorResponse(403, "APPROVER_READ_ONLY", "공동 승인자는 읽기만 할 수 있습니다.");
      return HttpResponse.json({
        hasImpact: state.impactItems.length > 0,
        affectedItems: state.impactItems,
      });
    }),

    http.put(`${prefix}/conditions`, async ({ params, request }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      if (resolved.info.role === "CO_APPROVER")
        return errorResponse(403, "APPROVER_READ_ONLY", "공동 승인자는 읽기만 할 수 있습니다.");
      const body = (await request.json()) as UpsertBody;
      if (body.acknowledgedNoticeVersion !== state.noticeVersion) {
        return errorResponse(409, "NOTICE_VERSION_CHANGED", "개인정보 안내 버전이 바뀌었습니다.");
      }
      const invalid = validateUpsert(body);
      if (invalid) return invalid;
      if (state.impactItems.length > 0 && !body.impactAcknowledged) {
        return errorResponse(409, "IMPACT_NOT_ACKNOWLEDGED", "영향을 확인하지 않았습니다.");
      }
      return HttpResponse.json(createVersion(resolved.info.approvalId, body, "DIRECT"));
    }),

    http.get(`${prefix}/visit-requests`, ({ params }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      if (resolved.info.role === "CO_APPROVER")
        return errorResponse(403, "APPROVER_READ_ONLY", "공동 승인자는 읽기만 할 수 있습니다.");
      const items = pendingRequests(resolved.info.approvalId).map((item) => {
        const { approvalId, ...rest } = item;
        void approvalId;
        return rest;
      });
      return HttpResponse.json({
        propertyAddress: "서울특별시 성북구 정릉로 77",
        activeConditionVersionNo: activeCondition(resolved.info.approvalId)?.versionNo ?? null,
        approvalRole: "PRIMARY",
        grantedOfficeNames: ["정릉부동산"],
        items,
        trustPolicyVersion: "TRUST_V1",
        trustAsOf: NOW,
        unconfirmedIndicators: ["ACCESS_DISTANCE", "PROPERTY_TYPE_FIT", "VERIFIED_DEALS"],
        privacyNotice: {
          noticeCode: "GUEST_LINK_NOTICE_APPROVER",
          noticeVersion: state.noticeVersion,
          retentionDays: 365,
        },
      });
    }),

    http.post(`${prefix}/visit-requests/:requestId/select`, async ({ params, request }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      if (resolved.info.role === "CO_APPROVER")
        return errorResponse(403, "APPROVER_READ_ONLY", "공동 승인자는 읽기만 할 수 있습니다.");
      const body = (await request.json()) as {
        comparedRequestIds: number[];
        acknowledgedNoticeVersion: string;
      };
      if (body.acknowledgedNoticeVersion !== state.noticeVersion) {
        return errorResponse(409, "NOTICE_VERSION_CHANGED", "개인정보 안내 버전이 바뀌었습니다.");
      }
      const target = state.requests.find(
        (item) =>
          String(item.requestId) === params.requestId &&
          item.approvalId === resolved.info.approvalId,
      );
      if (!target) return mockErrors.notFound();
      const header = request.headers.get("If-Match");
      if (header === null) {
        return mockErrors.validation([
          { field: "If-Match", code: "REQUIRED", message: "버전 정보가 필요합니다." },
        ]);
      }
      if (Number(header) !== target.version) {
        return mockErrors.versionConflict(target.version);
      }
      if (target.status !== "PENDING") {
        return errorResponse(409, "VISIT_REQUEST_INVALID_STATE", "처리할 수 없는 신청입니다.");
      }
      const selectionId = state.nextId++;
      if (state.revalidationFailure) {
        const failure = state.revalidationFailure;
        state.requests = state.requests.map((item) =>
          item === target
            ? { ...item, status: "REVALIDATION_FAILED", version: item.version + 1 }
            : item,
        );
        return HttpResponse.json({
          selectionId,
          requestId: target.requestId,
          requestStatus: "REVALIDATION_FAILED",
          revalidation: {
            result: "FAILED",
            failureCode: failure.code,
            failureDetail: failure.detail,
            checkedAt: NOW,
          },
          timeClosedRequestIds: [],
        });
      }
      const closed = pendingRequests(resolved.info.approvalId).filter(
        (item) => item !== target && overlaps(item, target),
      );
      state.requests = state.requests.map((item) => {
        if (item === target) return { ...item, status: "CONFIRMED", version: item.version + 1 };
        if (closed.includes(item)) return { ...item, status: "TIME_CLOSED" };
        return item;
      });
      state.confirmed = [
        ...state.confirmed,
        {
          approvalId: target.approvalId,
          scheduleItemId: state.nextId++,
          scheduledStartAt: target.requestedStartAt,
          scheduledEndAt: target.requestedEndAt,
          result: "SCHEDULED",
          state: "VALID",
          confirmedRequestId: target.requestId,
          applicantOfficeName: target.applicantOfficeName,
          applicantBrokerName: target.applicantBrokerName,
          applicantRelation: target.applicantRelation,
        },
      ];
      return HttpResponse.json({
        selectionId,
        requestId: target.requestId,
        requestStatus: "CONFIRMED",
        revalidation: { result: "PASSED", failureCode: null, failureDetail: null, checkedAt: NOW },
        timeClosedRequestIds: closed.map((item) => item.requestId),
      });
    }),

    http.get(`${prefix}/confirmed-schedules`, ({ params }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      const approvalId = conditionOwnerId(resolved.info);
      return HttpResponse.json({
        items: state.confirmed
          .filter((item) => item.approvalId === approvalId)
          .map((item) => {
            const { approvalId: owner, ...rest } = item;
            void owner;
            return rest;
          }),
        officeName: "사이로공인중개사",
        officeContactPhone: "02-1234-5678",
      });
    }),
  ];
}

export const visitApproverHandlers = [
  ...approverHandlers("/api/public/approver-property-links/:token", linkResolver),
  ...approverHandlers("/api/approver-portal/approvals/:token", portalResolver),
  http.get(
    "/api/properties/:propertyId/access-approvals/:approvalId/approver-conditions",
    ({ params }) => {
      if (getMockVisitState().callerRole === "DEPUTY") return mockErrors.forbidden();
      const approvalId = Number(params.approvalId);
      const items = state.conditions
        .filter((item) => item.approvalId === approvalId)
        .sort((a, b) => b.versionNo - a.versionNo);
      return HttpResponse.json({ items });
    },
  ),

  http.put(
    "/api/properties/:propertyId/access-approvals/:approvalId/approver-conditions/proxy",
    async ({ params, request }) => {
      if (getMockVisitState().callerRole === "DEPUTY") return mockErrors.forbidden();
      const approvalId = Number(params.approvalId);
      const approval = getMockVisitState().approvals.find((item) => item.approvalId === approvalId);
      if (!approval) return mockErrors.notFound();
      if (approval.approvalRole === "CO_APPROVER") {
        return errorResponse(409, "INVALID_TRANSITION", "공동 승인자에는 조건을 만들 수 없습니다.");
      }
      if (activeCondition(approvalId)?.source === "DIRECT") {
        return errorResponse(409, "INVALID_TRANSITION", "승인자 본인 입력이 활성입니다.");
      }
      const raw = (await request.json()) as Record<string, unknown>;
      if ("acknowledgedNoticeVersion" in raw) {
        return mockErrors.validation([
          {
            field: "acknowledgedNoticeVersion",
            code: "NOT_ALLOWED",
            message: "대리 입력은 안내 확인 버전을 받지 않습니다.",
          },
        ]);
      }
      const body = raw as unknown as UpsertBody;
      const invalid = validateUpsert(body);
      if (invalid) return invalid;
      if (state.impactItems.length > 0 && !body.impactAcknowledged) {
        return errorResponse(409, "IMPACT_NOT_ACKNOWLEDGED", "영향을 확인하지 않았습니다.");
      }
      return HttpResponse.json(createVersion(approvalId, body, "PROXY"));
    },
  ),
];
