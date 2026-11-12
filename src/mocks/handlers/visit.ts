import { http, HttpResponse } from "msw";
import type {
  AccessApprovalHistoryResponse,
  ReceivedApplyGrantListResponse,
  ScheduleConflictCheckResponse,
  VisitCoordinationDetailResponse,
} from "@/lib/api/contracts/visit.schema";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockCustomerState } from "./customer";
import { getMockPropertyState } from "./property";

const NOW = "2026-11-10T09:00:00+09:00";
const MS_DAY = 86_400_000;

export type MockVisitRole = "OWNER" | "AGENT" | "DEPUTY";
export type MockCoordination = VisitCoordinationDetailResponse;
export type MockApproval = AccessApprovalHistoryResponse["items"][number];
export type MockGrant = ReceivedApplyGrantListResponse["items"][number];
export type MockApproverLink = {
  linkId: number;
  issuedAt: string;
  expiresAt: string;
  lastAccessedAt: string | null;
};

export type VisitMockState = {
  callerRole: MockVisitRole;
  callerMembershipId: number;
  members: Array<{ membershipId: number; name: string }>;
  coordinations: MockCoordination[];
  deputyAssignedIds: number[];
  deputyLocked: boolean;
  managerConflictMembershipIds: number[];
  approvals: MockApproval[];
  approverLinks: Record<number, MockApproverLink>;
  receivedGrants: MockGrant[];
  conflicts: ScheduleConflictCheckResponse["conflicts"];
  nextId: number;
};

export function buildMockCoordination(
  partial: Partial<MockCoordination> & Pick<MockCoordination, "coordinationId">,
): MockCoordination {
  return {
    candidateProperties: [],
    customerRespondedAt: null,
    customerTimeSlots: [],
    managerName: "이중개",
    confirmedScheduleVersion: null,
    customerLink: null,
    rescheduleAlert: null,
    scheduleItems: [],
    alternatives: [],
    status: "TIME_COLLECTING",
    customerId: 301,
    customerName: "김수요",
    managerMembershipId: 2,
    periodStartDate: "2026-11-11",
    periodEndDate: "2026-11-20",
    createdAt: NOW,
    updatedAt: NOW,
    version: 1,
    officeId: 12,
    ...partial,
  };
}

export function buildMockCandidate(
  partial: Partial<MockCoordination["candidateProperties"][number]> &
    Pick<MockCoordination["candidateProperties"][number], "candidatePropertyId" | "propertyId">,
): MockCoordination["candidateProperties"][number] {
  return {
    sortOrder: partial.candidatePropertyId,
    propertyName: "국민대 앞 아파트",
    propertyAddress: "서울특별시 성북구 정릉로 77",
    approverRespondedAt: null,
    approverTimeSlots: [],
    applicableSlots: [],
    ownerOfficeId: 12,
    ownerOfficeName: "사이로 공인중개사사무소",
    crossOffice: false,
    grantId: null,
    grantState: null,
    propertyAddressDetail: null,
    ...partial,
  };
}

export function buildMockApproval(
  partial: Partial<MockApproval> & Pick<MockApproval, "approvalId" | "propertyId">,
): MockApproval {
  return {
    approverType: "OCCUPANT",
    approverName: "박점유",
    approverPhone: "010-2222-3333",
    validFrom: "2026-11-01T09:00:00+09:00",
    validUntil: "2026-12-31T18:00:00+09:00",
    source: "DIRECT",
    recordedByMembershipId: 2,
    recordedAt: NOW,
    confirmedAt: null,
    recordedByName: "이중개",
    timeSlots: [],
    approvalRole: "PRIMARY",
    revokedAt: null,
    revocationReason: null,
    revocationRecordedAt: null,
    revokedByUserId: null,
    ...partial,
  };
}

function initialState(): VisitMockState {
  const first = buildMockCoordination({
    coordinationId: 801,
    candidateProperties: [
      buildMockCandidate({ candidatePropertyId: 8011, propertyId: 501 }),
      buildMockCandidate({
        candidatePropertyId: 8012,
        propertyId: 502,
        propertyName: "정릉 상가",
        propertyAddress: "서울특별시 성북구 보국문로 10",
      }),
    ],
    customerRespondedAt: "2026-11-10T10:00:00+09:00",
    customerTimeSlots: [
      { startsAt: "2026-11-12T10:00:00+09:00", endsAt: "2026-11-12T14:00:00+09:00" },
    ],
    status: "COORDINATABLE",
    customerLink: {
      linkId: 9001,
      issuedAt: NOW,
      expiresAt: "2026-11-17T09:00:00+09:00",
      revokedAt: null,
      responseVersion: 1,
    },
  });
  return {
    callerRole: "OWNER",
    callerMembershipId: 2,
    members: [
      { membershipId: 2, name: "이중개" },
      { membershipId: 1, name: "김대표" },
    ],
    coordinations: [first],
    deputyAssignedIds: [],
    deputyLocked: false,
    managerConflictMembershipIds: [],
    approvals: [buildMockApproval({ approvalId: 7001, propertyId: 501 })],
    approverLinks: {},
    receivedGrants: [],
    conflicts: [],
    nextId: 8100,
  };
}

let state = initialState();

export function resetMockVisitState(): void {
  state = initialState();
}

export function getMockVisitState(): VisitMockState {
  return state;
}

export function setMockVisitState(partial: Partial<VisitMockState>): void {
  state = { ...state, ...partial };
}

function todayKst(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / MS_DAY);
}

function matchVersion(request: Request, version: number): "ok" | "missing" | "conflict" {
  const header = request.headers.get("If-Match");
  if (header === null || header.trim() === "" || Number.isNaN(Number(header))) return "missing";
  return Number(header) === version ? "ok" : "conflict";
}

function versionFailure(check: "missing" | "conflict", version: number) {
  if (check === "missing")
    return mockErrors.validation([{ field: "If-Match", message: "조율 버전이 필요합니다." }]);
  return mockErrors.versionConflict(version);
}

function visible(coordination: MockCoordination): boolean {
  if (state.callerRole !== "DEPUTY") return true;
  return state.deputyAssignedIds.includes(coordination.coordinationId);
}

function findCoordination(id: string | readonly string[] | undefined) {
  const found = state.coordinations.find((item) => String(item.coordinationId) === String(id));
  return found && visible(found) ? found : undefined;
}

function replace(next: MockCoordination): MockCoordination {
  state.coordinations = state.coordinations.map((item) =>
    item.coordinationId === next.coordinationId ? next : item,
  );
  return next;
}

function bump(coordination: MockCoordination, changes: Partial<MockCoordination>) {
  return replace({
    ...coordination,
    ...changes,
    updatedAt: NOW,
    version: coordination.version + 1,
  });
}

function memberName(membershipId: number): string | undefined {
  return state.members.find((item) => item.membershipId === membershipId)?.name;
}

type Resolved = { propertyName: string; propertyAddress: string; grant: MockGrant | null };

function resolveProperty(propertyId: number): Resolved | undefined {
  const own = getMockPropertyState().properties.find(
    (item) => item.propertyId === propertyId && !item.deletedAt,
  );
  if (own) return { propertyName: own.name, propertyAddress: own.address ?? "", grant: null };
  const grant = state.receivedGrants.find((item) => item.propertyId === propertyId);
  if (grant)
    return { propertyName: grant.propertyName, propertyAddress: grant.propertyAddress, grant };
  return undefined;
}

function candidateFor(
  candidatePropertyId: number,
  propertyId: number,
  sortOrder: number,
  resolved: Resolved,
): MockCoordination["candidateProperties"][number] {
  const grant = resolved.grant;
  return buildMockCandidate({
    candidatePropertyId,
    propertyId,
    sortOrder,
    propertyName: resolved.propertyName,
    propertyAddress: grant ? null : resolved.propertyAddress,
    ownerOfficeId: grant ? grant.ownerOfficeId : 12,
    ownerOfficeName: grant ? grant.ownerOfficeName : "사이로 공인중개사사무소",
    crossOffice: grant !== null,
    grantId: grant ? grant.grantId : null,
    grantState: grant ? "ACTIVE" : null,
  });
}

function toListItem(item: MockCoordination) {
  return {
    coordinationId: item.coordinationId,
    customerName: item.customerName,
    candidatePropertyCount: item.candidateProperties.length,
    managerName: item.managerName,
    periodStartDate: item.periodStartDate,
    periodEndDate: item.periodEndDate,
    candidateProperties: item.candidateProperties.map((candidate) => ({
      candidatePropertyId: candidate.candidatePropertyId,
      propertyName: candidate.propertyName,
    })),
    status: item.status,
    managerMembershipId: item.managerMembershipId,
    createdAt: item.createdAt,
    officeId: item.officeId,
    updatedAt: item.updatedAt,
    version: item.version,
  };
}

const STATUS_KEYS = [
  "TIME_COLLECTING",
  "COORDINATABLE",
  "FINAL_CONFIRMATION_REQUIRED",
  "APPLYING",
  "CONFIRMED",
  "RESCHEDULE_REQUIRED",
  "VISIT_COMPLETED",
  "VISIT_INCOMPLETE",
  "CANCELLED",
] as const;

const SCHEDULABLE = ["COORDINATABLE", "FINAL_CONFIRMATION_REQUIRED", "RESCHEDULE_REQUIRED"];

function randomToken(prefix: string): string {
  return `${prefix}-${state.nextId++}-abcdefghijklmnop`;
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

function requireStaff() {
  return state.callerRole === "DEPUTY" ? mockErrors.forbidden() : null;
}

export const visitHandlers = [
  http.get("/api/visit-coordinations", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const mine = state.coordinations.filter(visible);
    const counts = Object.fromEntries(
      STATUS_KEYS.map((key) => [key, mine.filter((item) => item.status === key).length]),
    ) as Record<(typeof STATUS_KEYS)[number], number>;
    const filtered = status ? mine.filter((item) => status.split(",").includes(item.status)) : mine;
    return HttpResponse.json({
      ...pageOf(filtered.map(toListItem), url),
      statusCounts: counts,
    });
  }),

  http.post("/api/visit-coordinations", async ({ request }) => {
    if (state.callerRole === "DEPUTY" && state.deputyLocked) {
      return errorResponse(403, "DEPUTY_VISIT_LOCKED", "방문업무가 잠겼습니다.");
    }
    const body = (await request.json()) as {
      customerId: number;
      candidatePropertyIds: number[];
      managerMembershipId?: number | null;
      periodStartDate: string;
      periodEndDate: string;
    };
    const ids = body.candidatePropertyIds ?? [];
    const today = todayKst();
    if (
      ids.length < 1 ||
      new Set(ids).size !== ids.length ||
      body.periodStartDate < today ||
      body.periodEndDate < body.periodStartDate
    ) {
      return mockErrors.validation([
        { field: "candidatePropertyIds", message: "후보 매물과 방문 가능 기간을 확인해 주세요." },
      ]);
    }
    if (ids.length > 20)
      return errorResponse(422, "CANDIDATE_LIMIT_EXCEEDED", "후보 매물은 20개까지입니다.");
    if (daysBetween(today, body.periodEndDate) > 30)
      return errorResponse(422, "PERIOD_TOO_LONG", "방문 가능 기간은 30일 이내입니다.");
    const customer = getMockCustomerState().customers.find(
      (item) => item.customerId === body.customerId,
    );
    if (!customer) return mockErrors.notFound();
    if (customer.deletedAt)
      return errorResponse(409, "CUSTOMER_ARCHIVED", "보관된 고객은 선택할 수 없습니다.");
    const resolved = ids.map((id) => ({ id, value: resolveProperty(id) }));
    if (resolved.some((item) => item.value === undefined)) {
      return errorResponse(422, "CANDIDATE_NOT_ALLOWED", "신청 권한이 없는 매물이 있습니다.");
    }
    const managerId = body.managerMembershipId ?? state.callerMembershipId;
    const coordinationId = state.nextId++;
    const candidateProperties = resolved.map((item, index) =>
      candidateFor(state.nextId++, item.id, index + 1, item.value as Resolved),
    );
    const created = buildMockCoordination({
      coordinationId,
      customerId: customer.customerId,
      customerName: customer.name,
      managerMembershipId: managerId,
      managerName: memberName(managerId) ?? "담당자",
      periodStartDate: body.periodStartDate,
      periodEndDate: body.periodEndDate,
      candidateProperties,
    });
    state.coordinations = [created, ...state.coordinations];
    return HttpResponse.json(
      {
        coordinationId,
        status: created.status,
        candidateProperties: candidateProperties.map((item) => ({
          candidatePropertyId: item.candidatePropertyId,
          propertyId: item.propertyId,
          sortOrder: item.sortOrder,
        })),
        officeId: 12,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/visit-coordinations/:id", ({ params }) => {
    const found = findCoordination(params.id);
    return found ? HttpResponse.json(found) : mockErrors.notFound();
  }),

  http.post("/api/visit-coordinations/:id/candidate-properties", async ({ params, request }) => {
    const found = findCoordination(params.id);
    if (!found) return mockErrors.notFound();
    const denied = requireStaff();
    if (denied) return denied;
    const body = (await request.json()) as { propertyId: number };
    if (found.candidateProperties.length >= 20)
      return errorResponse(422, "CANDIDATE_LIMIT_EXCEEDED", "후보 매물은 20개까지입니다.");
    if (found.candidateProperties.some((item) => item.propertyId === body.propertyId)) {
      return mockErrors.validation([{ field: "propertyId", message: "이미 담긴 매물입니다." }]);
    }
    const resolved = resolveProperty(body.propertyId);
    if (!resolved)
      return errorResponse(422, "CANDIDATE_NOT_ALLOWED", "신청 권한이 없는 매물입니다.");
    const candidatePropertyId = state.nextId++;
    const candidate = candidateFor(
      candidatePropertyId,
      body.propertyId,
      found.candidateProperties.length + 1,
      resolved,
    );
    const next = bump(found, { candidateProperties: [...found.candidateProperties, candidate] });
    return HttpResponse.json(
      {
        candidatePropertyId,
        coordinationId: found.coordinationId,
        propertyId: body.propertyId,
        sortOrder: candidate.sortOrder,
        officeId: 12,
        version: next.version,
      },
      { status: 201 },
    );
  }),

  http.delete("/api/visit-coordinations/:id/candidate-properties/:candidateId", ({ params }) => {
    const found = findCoordination(params.id);
    if (!found) return mockErrors.notFound();
    const denied = requireStaff();
    if (denied) return denied;
    const candidate = found.candidateProperties.find(
      (item) => String(item.candidatePropertyId) === params.candidateId,
    );
    if (!candidate) return mockErrors.notFound();
    const grantInactive = candidate.crossOffice && candidate.grantState !== "ACTIVE";
    const hasConfirmed = (found.scheduleItems ?? []).some(
      (item) => item.candidatePropertyId === candidate.candidatePropertyId,
    );
    const allowed = found.status === "TIME_COLLECTING" || (grantInactive && !hasConfirmed);
    if (!allowed)
      return errorResponse(409, "INVALID_TRANSITION", "지금은 후보를 제거할 수 없습니다.");
    bump(found, {
      candidateProperties: found.candidateProperties.filter((item) => item !== candidate),
    });
    return new HttpResponse(null, { status: 204 });
  }),

  http.put("/api/visit-coordinations/:id/schedule", async ({ params, request }) => {
    const found = findCoordination(params.id);
    if (!found) return mockErrors.notFound();
    const denied = requireStaff();
    if (denied) return denied;
    const check = matchVersion(request, found.version);
    if (check !== "ok") return versionFailure(check, found.version);
    if (!SCHEDULABLE.includes(found.status))
      return errorResponse(409, "INVALID_TRANSITION", "지금은 일정을 저장할 수 없습니다.");
    const body = (await request.json()) as {
      items: Array<{
        candidatePropertyId: number;
        sortOrder: number;
        visitDurationMinutes?: number;
        travelDurationMinutes?: number;
      }>;
    };
    const first = found.customerTimeSlots[0];
    if (!first) {
      return errorResponse(422, "TIME_OUT_OF_RANGE", "고객 가능 시간이 없습니다.");
    }
    const ordered = [...body.items].sort((a, b) => a.sortOrder - b.sortOrder);
    let cursor = Date.parse(first.startsAt);
    const limit = Date.parse(first.endsAt);
    const items: Array<{
      candidatePropertyId: number;
      sortOrder: number;
      suggestedStartAt: string;
      suggestedEndAt: string;
    }> = [];
    for (const item of ordered) {
      const visit = item.visitDurationMinutes ?? 30;
      const travel = item.travelDurationMinutes ?? 15;
      const end = cursor + visit * 60_000;
      if (end > limit)
        return errorResponse(422, "TIME_OUT_OF_RANGE", "허용된 시간 범위를 벗어납니다.");
      items.push({
        candidatePropertyId: item.candidatePropertyId,
        sortOrder: item.sortOrder,
        suggestedStartAt: new Date(cursor).toISOString().replace(".000Z", "+00:00"),
        suggestedEndAt: new Date(end).toISOString().replace(".000Z", "+00:00"),
      });
      cursor = end + travel * 60_000;
    }
    const nextStatus =
      found.status === "COORDINATABLE" ? "FINAL_CONFIRMATION_REQUIRED" : found.status;
    // 일정 구성으로 계산된 시작 시각 구간을 후보 매물의 신청 가능 구간으로 돌려준다.
    const candidateProperties = found.candidateProperties.map((candidate) => {
      const item = items.find(
        (entry) => entry.candidatePropertyId === candidate.candidatePropertyId,
      );
      return item
        ? {
            ...candidate,
            applicableSlots: [{ startsAt: item.suggestedStartAt, endsAt: item.suggestedEndAt }],
          }
        : candidate;
    });
    const next = bump(found, { status: nextStatus, candidateProperties });
    return HttpResponse.json({
      coordinationId: next.coordinationId,
      status: next.status,
      items,
      officeId: 12,
      createdAt: next.createdAt,
      updatedAt: next.updatedAt,
      version: next.version,
    });
  }),

  http.get("/api/visit-coordinations/:id/schedule/conflicts", ({ params }) => {
    const found = findCoordination(params.id);
    if (!found) return mockErrors.notFound();
    return HttpResponse.json({ conflicts: state.conflicts });
  }),

  http.patch("/api/visit-coordinations/:id/manager", async ({ params, request }) => {
    const found = findCoordination(params.id);
    if (!found) return mockErrors.notFound();
    const denied = requireStaff();
    if (denied) return denied;
    const check = matchVersion(request, found.version);
    if (check !== "ok") return versionFailure(check, found.version);
    if (["CANCELLED", "VISIT_COMPLETED", "VISIT_INCOMPLETE"].includes(found.status))
      return errorResponse(409, "INVALID_TRANSITION", "지금은 담당자를 바꿀 수 없습니다.");
    const body = (await request.json()) as { managerMembershipId: number };
    const name = memberName(body.managerMembershipId);
    if (!name) return mockErrors.notFound();
    if (state.managerConflictMembershipIds.includes(body.managerMembershipId))
      return errorResponse(409, "SCHEDULE_CONFLICT", "새 담당자의 확정 일정과 겹칩니다.");
    const next = bump(found, { managerMembershipId: body.managerMembershipId, managerName: name });
    return HttpResponse.json({
      coordinationId: next.coordinationId,
      status: next.status,
      customerId: next.customerId,
      customerName: next.customerName,
      managerMembershipId: next.managerMembershipId,
      periodStartDate: next.periodStartDate,
      periodEndDate: next.periodEndDate,
      candidateProperties: next.candidateProperties.map((item) => ({
        candidatePropertyId: item.candidatePropertyId,
        propertyId: item.propertyId,
        sortOrder: item.sortOrder,
        propertyName: item.propertyName,
        propertyAddress: item.propertyAddress,
        approverRespondedAt: item.approverRespondedAt,
        approverTimeSlots: item.approverTimeSlots,
      })),
      customerRespondedAt: next.customerRespondedAt,
      customerTimeSlots: next.customerTimeSlots,
      scheduleItems: [],
      affectedItems: [],
      managerName: next.managerName,
      confirmedScheduleVersion: next.confirmedScheduleVersion,
      customerLink: next.customerLink,
      rescheduleAlert: next.rescheduleAlert,
      createdAt: next.createdAt,
      updatedAt: next.updatedAt,
      version: next.version,
      officeId: 12,
    });
  }),

  http.post("/api/visit-coordinations/:id/customer-link", ({ params }) => {
    const found = findCoordination(params.id);
    if (!found) return mockErrors.notFound();
    if (["CANCELLED", "VISIT_COMPLETED", "VISIT_INCOMPLETE"].includes(found.status))
      return errorResponse(409, "INVALID_TRANSITION", "지금은 링크를 발급할 수 없습니다.");
    if (found.customerLink && !found.customerLink.revokedAt)
      return errorResponse(409, "INVALID_TRANSITION", "이미 발급된 링크가 있습니다.");
    const linkId = state.nextId++;
    const token = randomToken("customer-token");
    bump(found, {
      customerLink: {
        linkId,
        issuedAt: NOW,
        expiresAt: "2026-11-17T09:00:00+09:00",
        revokedAt: null,
        responseVersion: 1,
      },
    });
    return HttpResponse.json(
      {
        linkId,
        token,
        publicUrl: `https://sairo.example.com/visit-responses/${token}`,
        issuedAt: NOW,
        expiresAt: "2026-11-17T09:00:00+09:00",
      },
      { status: 201 },
    );
  }),

  http.post("/api/visit-coordinations/:id/customer-link/reissue", ({ params }) => {
    const found = findCoordination(params.id);
    if (!found) return mockErrors.notFound();
    if (!found.customerLink)
      return errorResponse(409, "INVALID_TRANSITION", "발급된 링크가 없습니다.");
    const linkId = state.nextId++;
    const token = randomToken("customer-token");
    bump(found, {
      customerLink: {
        linkId,
        issuedAt: NOW,
        expiresAt: "2026-11-17T09:00:00+09:00",
        revokedAt: null,
        responseVersion: 1,
      },
    });
    return HttpResponse.json({
      linkId,
      token,
      publicUrl: `https://sairo.example.com/visit-responses/${token}`,
      issuedAt: NOW,
      expiresAt: "2026-11-17T09:00:00+09:00",
    });
  }),

  http.get("/api/customers/:customerId/assistant-view", ({ params }) => {
    const customer = getMockCustomerState().customers.find(
      (item) => String(item.customerId) === params.customerId,
    );
    if (!customer) return mockErrors.notFound();
    const assigned = state.coordinations.some(
      (item) =>
        item.customerId === customer.customerId &&
        state.deputyAssignedIds.includes(item.coordinationId),
    );
    if (state.callerRole === "DEPUTY" && !assigned) return mockErrors.forbidden();
    return HttpResponse.json({
      customerId: customer.customerId,
      name: customer.name,
      phone: customer.phone ?? null,
    });
  }),

  http.get("/api/apply-grants/received", ({ request }) => {
    const url = new URL(request.url);
    const keyword = url.searchParams.get("keyword");
    const filtered = state.receivedGrants.filter(
      (item) => !keyword || `${item.propertyName}${item.ownerOfficeName}`.includes(keyword),
    );
    return HttpResponse.json(pageOf(filtered, url));
  }),

  http.get("/api/properties/:propertyId/access-approvals", ({ params }) => {
    const denied = requireStaff();
    if (denied) return denied;
    const property = getMockPropertyState().properties.find(
      (item) => String(item.propertyId) === params.propertyId,
    );
    if (!property) return mockErrors.notFound();
    const items = state.approvals.filter((item) => item.propertyId === property.propertyId);
    return HttpResponse.json({ items, page: 0, size: 100, totalElements: items.length });
  }),

  http.post("/api/properties/:propertyId/access-approvals", async ({ params, request }) => {
    const denied = requireStaff();
    if (denied) return denied;
    const property = getMockPropertyState().properties.find(
      (item) => String(item.propertyId) === params.propertyId,
    );
    if (!property) return mockErrors.notFound();
    const body = (await request.json()) as {
      approverType: MockApproval["approverType"];
      approverName: string;
      approverPhone?: string | null;
      validFrom: string;
      validUntil: string;
      source: "DIRECT" | "PROXY";
      approvalRole?: "PRIMARY" | "CO_APPROVER";
      confirmedAt?: string | null;
    };
    const fieldErrors = [];
    if (!body.approverName?.trim())
      fieldErrors.push({ field: "approverName", message: "승인자 이름을 입력해 주세요." });
    if (body.source === "DIRECT" && !body.approverPhone)
      fieldErrors.push({ field: "approverPhone", message: "연락처를 입력해 주세요." });
    if (body.source === "PROXY" && !body.confirmedAt)
      fieldErrors.push({ field: "confirmedAt", message: "실제 확인 시각을 입력해 주세요." });
    if (Date.parse(body.validUntil) <= Date.parse(body.validFrom))
      fieldErrors.push({
        field: "validUntil",
        message: "종료 시각은 시작 시각보다 늦어야 합니다.",
      });
    if (fieldErrors.length > 0) return mockErrors.validation(fieldErrors);
    const role = body.approvalRole ?? "PRIMARY";
    const overlapping = state.approvals.some(
      (item) =>
        item.propertyId === property.propertyId &&
        item.approvalRole === "PRIMARY" &&
        !item.revokedAt &&
        Date.parse(item.validFrom) < Date.parse(body.validUntil) &&
        Date.parse(body.validFrom) < Date.parse(item.validUntil),
    );
    if (role === "PRIMARY" && overlapping)
      return errorResponse(409, "PRIMARY_APPROVER_EXISTS", "대표 승인자 출입승인이 이미 있습니다.");
    const approvalId = state.nextId++;
    const created = buildMockApproval({
      approvalId,
      propertyId: property.propertyId,
      approverType: body.approverType,
      approverName: body.approverName,
      approverPhone: body.approverPhone ?? null,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      source: body.source,
      approvalRole: role,
      confirmedAt: body.confirmedAt ?? null,
      recordedByMembershipId: state.callerMembershipId,
      recordedByName: memberName(state.callerMembershipId) ?? null,
    });
    state.approvals = [created, ...state.approvals];
    return HttpResponse.json(
      {
        approvalId,
        propertyId: created.propertyId,
        approverType: created.approverType,
        approverName: created.approverName,
        approverPhone: created.approverPhone,
        validFrom: created.validFrom,
        validUntil: created.validUntil,
        timeSlots: [],
        source: created.source,
        approvalRole: role,
        recordedByMembershipId: created.recordedByMembershipId,
        recordedByName: created.recordedByName,
        confirmedAt: created.confirmedAt,
        createdAt: NOW,
        officeId: 12,
        version: 1,
        revokedAt: null,
        revocationReason: null,
        revocationRecordedAt: null,
        revokedByUserId: null,
      },
      { status: 201 },
    );
  }),

  http.get(
    "/api/properties/:propertyId/access-approvals/:approvalId/approver-property-link",
    ({ params }) => {
      const denied = requireStaff();
      if (denied) return denied;
      const approval = state.approvals.find(
        (item) => String(item.approvalId) === params.approvalId,
      );
      if (!approval) return mockErrors.notFound();
      const link = state.approverLinks[approval.approvalId];
      return HttpResponse.json({
        hasActiveLink: Boolean(link),
        linkId: link?.linkId ?? null,
        approvalRole: approval.approvalRole,
        issuedAt: link?.issuedAt ?? null,
        expiresAt: link?.expiresAt ?? null,
        lastAccessedAt: link?.lastAccessedAt ?? null,
      });
    },
  ),

  http.post(
    "/api/properties/:propertyId/access-approvals/:approvalId/approver-property-link",
    ({ params }) => {
      if (state.callerRole === "DEPUTY") return mockErrors.forbidden();
      const approval = state.approvals.find(
        (item) => String(item.approvalId) === params.approvalId,
      );
      if (!approval) return mockErrors.notFound();
      if (approval.revokedAt || !approval.approverPhone)
        return errorResponse(409, "INVALID_TRANSITION", "링크를 발급할 수 없는 출입승인입니다.");
      const linkId = state.nextId++;
      const token = randomToken("approver-token");
      state.approverLinks = {
        ...state.approverLinks,
        [approval.approvalId]: {
          linkId,
          issuedAt: NOW,
          expiresAt: "2026-11-17T09:00:00+09:00",
          lastAccessedAt: null,
        },
      };
      return HttpResponse.json(
        {
          linkId,
          approvalId: approval.approvalId,
          approvalRole: approval.approvalRole,
          token,
          publicUrl: `https://sairo.example.com/approver/${token}`,
          issuedAt: NOW,
          expiresAt: "2026-11-17T09:00:00+09:00",
        },
        { status: 201 },
      );
    },
  ),

  http.delete(
    "/api/properties/:propertyId/access-approvals/:approvalId/approver-property-link",
    ({ params }) => {
      if (state.callerRole === "DEPUTY") return mockErrors.forbidden();
      const approvalId = Number(params.approvalId);
      if (!state.approverLinks[approvalId]) return mockErrors.notFound();
      const rest = { ...state.approverLinks };
      delete rest[approvalId];
      state.approverLinks = rest;
      return new HttpResponse(null, { status: 204 });
    },
  ),
];
