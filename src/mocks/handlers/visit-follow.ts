import { http, HttpResponse } from "msw";
import type {
  AssistantNoticeListResponse,
  ConfirmationDeliveryListResponse,
  PublicConfirmedVisitResponse,
  PublicVisitLinkResponse,
  VisitScheduleItemResultHistoryResponse,
} from "@/lib/api/contracts/visit.schema";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockVisitState, setMockVisitState } from "./visit";
import type { MockCoordination } from "./visit";

const NOW = "2026-11-10T09:00:00+09:00";

export const MOCK_CUSTOMER_TOKEN = "customer-token-0000001";
export const MOCK_CUSTOMER_EXPIRED_TOKEN = "customer-expired-0000001";
export const MOCK_CUSTOMER_NOTICE_VERSION = "visit-customer-v1";

type Item = NonNullable<MockCoordination["scheduleItems"]>[number];
type MockHistory = VisitScheduleItemResultHistoryResponse["items"][number];
type MockNotice = AssistantNoticeListResponse["items"][number] & { scheduleItemId: number };
type MockDelivery = ConfirmationDeliveryListResponse["items"][number];

export type VisitFollowMockState = {
  histories: Record<number, MockHistory[]>;
  notices: MockNotice[];
  requiredRecipients: AssistantNoticeListResponse["requiredRecipients"];
  deliveries: MockDelivery[];
  customerLink: PublicVisitLinkResponse;
  customerSubmitted: Array<{ startsAt: string; endsAt: string }>;
  customerConfirmed: PublicConfirmedVisitResponse | "NONE";
  noAlternativeItemIds: number[];
  nextId: number;
};

function initialState(): VisitFollowMockState {
  return {
    histories: {},
    notices: [],
    requiredRecipients: [
      { recipientType: "CUSTOMER", candidatePropertyId: null, recorded: false },
      { recipientType: "APPROVER", candidatePropertyId: 8011, recorded: false },
    ],
    deliveries: [],
    customerLink: {
      role: "CUSTOMER",
      officeName: "사이로 공인중개사사무소",
      managerDisplayName: "이중개",
      managerLegalRole: "AFFILIATED_AGENT",
      candidateWindow: { startDate: "2026-11-11", endDate: "2026-11-20" },
      candidateProperties: [
        { candidatePropertyId: 8011, displayName: "국민대 앞 아파트", district: "성북구 정릉동" },
      ],
      submittedTimeSlots: [],
      responseVersion: 0,
      coordinationStatus: "TIME_COLLECTING",
      linkExpiresAt: "2026-11-17T09:00:00+09:00",
      officeContactPhone: "02-1234-5678",
      privacyNotice: {
        purpose: "방문 가능 시간 수집과 방문 일정 조율",
        collectedItems: ["방문 가능 시간"],
        retentionPeriod: "방문 조율 기록 보유기한",
        noticeCode: "CUSTOMER_VISIT",
        noticeVersion: MOCK_CUSTOMER_NOTICE_VERSION,
        retentionDays: 365,
      },
    },
    customerSubmitted: [],
    customerConfirmed: "NONE",
    noAlternativeItemIds: [],
    nextId: 9000,
  };
}

let state = initialState();

export function resetMockVisitFollowState(): void {
  state = initialState();
}

export function getMockVisitFollowState(): VisitFollowMockState {
  return state;
}

export function setMockVisitFollowState(partial: Partial<VisitFollowMockState>): void {
  state = { ...state, ...partial };
}

function locate(itemId: string | readonly string[] | undefined) {
  const visit = getMockVisitState();
  for (const coordination of visit.coordinations) {
    const item = coordination.scheduleItems?.find(
      (entry) => String(entry.itemId) === String(itemId),
    );
    if (item) {
      const hidden =
        visit.callerRole === "DEPUTY" &&
        !visit.deputyAssignedIds.includes(coordination.coordinationId);
      return hidden ? undefined : { coordination, item };
    }
  }
  return undefined;
}

function findCoordination(id: string | readonly string[] | undefined) {
  const visit = getMockVisitState();
  const found = visit.coordinations.find((entry) => String(entry.coordinationId) === String(id));
  if (!found) return undefined;
  if (visit.callerRole === "DEPUTY" && !visit.deputyAssignedIds.includes(found.coordinationId)) {
    return undefined;
  }
  return found;
}

function save(next: MockCoordination) {
  const visit = getMockVisitState();
  setMockVisitState({
    coordinations: visit.coordinations.map((entry) =>
      entry.coordinationId === next.coordinationId ? next : entry,
    ),
  });
  return next;
}

function bump(coordination: MockCoordination, changes: Partial<MockCoordination>) {
  return save({ ...coordination, ...changes, updatedAt: NOW, version: coordination.version + 1 });
}

function settledStatus(items: Item[], current: string): string {
  if (items.length === 0 || items.some((entry) => entry.result === "SCHEDULED")) return current;
  return items.some((entry) => entry.result === "COMPLETED")
    ? "VISIT_COMPLETED"
    : "VISIT_INCOMPLETE";
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

function denyDeputy() {
  return getMockVisitState().callerRole === "DEPUTY" ? mockErrors.forbidden() : null;
}

export const visitFollowHandlers = [
  http.patch("/api/visit-schedule-items/:itemId/result", async ({ params, request }) => {
    const found = locate(params.itemId);
    if (!found) return mockErrors.notFound();
    const { coordination, item } = found;
    const body = (await request.json()) as {
      result: "COMPLETED" | "NO_SHOW" | "CANCELLED";
      actualVisitedAt?: string | null;
      correctionReason?: string | null;
      cancelReasonCode?: string | null;
    };
    if (coordination.status === "CANCELLED") {
      return errorResponse(409, "INVALID_TRANSITION", "취소된 조율에는 결과를 기록할 수 없습니다.");
    }
    const isCorrection = item.result !== "SCHEDULED";
    const fieldErrors: Array<{ field: string; message: string }> = [];
    if (body.result === "COMPLETED" && !body.actualVisitedAt) {
      fieldErrors.push({ field: "actualVisitedAt", message: "실제 방문 시각이 필요합니다." });
    }
    if (body.actualVisitedAt && Date.parse(body.actualVisitedAt) > Date.parse(NOW)) {
      fieldErrors.push({ field: "actualVisitedAt", message: "미래 시각은 입력할 수 없습니다." });
    }
    if (isCorrection && (body.correctionReason ?? "").trim() === "") {
      fieldErrors.push({ field: "correctionReason", message: "정정 사유가 필요합니다." });
    }
    if (fieldErrors.length > 0) return mockErrors.validation(fieldErrors);
    const nextItems = (coordination.scheduleItems ?? []).map((entry) =>
      entry.itemId === item.itemId
        ? {
            ...entry,
            result: body.result,
            resultRecordedAt: NOW,
            correctionCount: isCorrection ? entry.correctionCount + 1 : entry.correctionCount,
          }
        : entry,
    );
    const status = settledStatus(nextItems, coordination.status);
    bump(coordination, { scheduleItems: nextItems, status });
    const history = state.histories[item.itemId] ?? [];
    state.histories = {
      ...state.histories,
      [item.itemId]: [
        ...history,
        {
          historyId: state.nextId++,
          previousResult: isCorrection ? item.result : null,
          newResult: body.result,
          previousActualVisitedAt: null,
          newActualVisitedAt: body.actualVisitedAt ?? null,
          correctionReason: body.correctionReason ?? null,
          effectiveAt: NOW,
          recordedAt: NOW,
          recordedByName: "이중개",
        },
      ],
    };
    return HttpResponse.json({
      itemId: item.itemId,
      coordinationId: coordination.coordinationId,
      result: body.result,
      actualVisitedAt: body.actualVisitedAt ?? null,
      resultRecordedAt: NOW,
      reviewWindowEndsAt: body.result === "COMPLETED" ? "2026-11-24T09:00:00+09:00" : null,
      correctionCount: isCorrection ? item.correctionCount + 1 : item.correctionCount,
      coordinationStatus: status,
      affectedItems: [],
      updatedAt: NOW,
    });
  }),

  http.get("/api/visit-schedule-items/:itemId/result-history", ({ params }) => {
    const found = locate(params.itemId);
    if (!found) return mockErrors.notFound();
    return HttpResponse.json({ items: state.histories[found.item.itemId] ?? [] });
  }),

  http.post("/api/visit-coordinations/:id/reschedule", async ({ params, request }) => {
    const denied = denyDeputy();
    if (denied) return denied;
    const coordination = findCoordination(params.id);
    if (!coordination) return mockErrors.notFound();
    if (!["CONFIRMED", "RESCHEDULE_REQUIRED"].includes(coordination.status)) {
      return errorResponse(409, "INVALID_TRANSITION", "지금은 재조율로 전환할 수 없습니다.");
    }
    const body = (await request.json()) as { reason?: string | null };
    const items = coordination.scheduleItems ?? [];
    const affected = items.filter((entry) => entry.result === "SCHEDULED");
    const next = bump(coordination, {
      status: "RESCHEDULE_REQUIRED",
      rescheduleAlert: {
        triggerType: "SCHEDULE_CHANGED",
        reason: body.reason ?? null,
        raisedAt: NOW,
        approvalId: null,
      },
      scheduleItems: items.map((entry) =>
        entry.result === "SCHEDULED" ? { ...entry, state: "RESCHEDULE_REQUIRED" as const } : entry,
      ),
    });
    return HttpResponse.json({
      coordinationId: next.coordinationId,
      status: next.status,
      customerId: next.customerId,
      customerName: next.customerName,
      managerMembershipId: next.managerMembershipId,
      periodStartDate: next.periodStartDate,
      periodEndDate: next.periodEndDate,
      candidateProperties: next.candidateProperties.map((entry) => ({
        candidatePropertyId: entry.candidatePropertyId,
        propertyId: entry.propertyId,
        sortOrder: entry.sortOrder,
      })),
      scheduleItems: (next.scheduleItems ?? []).map((entry) => ({
        itemId: entry.itemId,
        candidatePropertyId: entry.candidatePropertyId,
        scheduledStartAt: entry.scheduledStartAt,
        scheduledEndAt: entry.scheduledEndAt,
        result: entry.result,
        state: entry.state,
      })),
      fixedScheduleItemIds: items
        .filter((entry) => entry.result !== "SCHEDULED")
        .map((entry) => entry.itemId),
      affectedItems: affected.map((entry) => ({
        scheduleItemId: entry.itemId,
        candidatePropertyId: entry.candidatePropertyId,
        state: "RESCHEDULE_REQUIRED",
        reason: body.reason ?? "일정 변경",
      })),
      alternatives: next.alternatives,
      noAlternativeScheduleItemIds: state.noAlternativeItemIds,
      createdAt: next.createdAt,
      updatedAt: next.updatedAt,
      version: next.version,
      officeId: next.officeId,
    });
  }),

  http.post("/api/visit-coordinations/:id/access-revocations", async ({ params, request }) => {
    const denied = denyDeputy();
    if (denied) return denied;
    const coordination = findCoordination(params.id);
    if (!coordination) return mockErrors.notFound();
    const body = (await request.json()) as {
      approvalId: number;
      revokedAt: string;
      revocationReason: string;
    };
    if (Date.parse(body.revokedAt) > Date.parse(NOW)) {
      return mockErrors.validation([
        { field: "revokedAt", message: "미래 시각은 입력할 수 없습니다." },
      ]);
    }
    const approval = getMockVisitState().approvals.find(
      (entry) => entry.approvalId === body.approvalId,
    );
    if (!approval || approval.revokedAt) {
      return errorResponse(409, "INVALID_TRANSITION", "이미 철회되었거나 없는 출입승인입니다.");
    }
    setMockVisitState({
      approvals: getMockVisitState().approvals.map((entry) =>
        entry.approvalId === body.approvalId
          ? {
              ...entry,
              revokedAt: body.revokedAt,
              revocationReason: body.revocationReason,
              revocationRecordedAt: NOW,
            }
          : entry,
      ),
    });
    const next = bump(coordination, {
      status: "RESCHEDULE_REQUIRED",
      rescheduleAlert: {
        triggerType: "ACCESS_REVOKED",
        reason: body.revocationReason,
        raisedAt: NOW,
        approvalId: body.approvalId,
      },
    });
    return HttpResponse.json({
      approvalId: body.approvalId,
      coordinationId: next.coordinationId,
      officeId: next.officeId,
      revokedAt: body.revokedAt,
      revocationRecordedAt: NOW,
      revokedByUserId: 1,
      status: next.status,
      version: next.version,
    });
  }),

  http.post("/api/visit-coordinations/:id/cancel", async ({ params }) => {
    const coordination = findCoordination(params.id);
    if (!coordination) return mockErrors.notFound();
    if (["CANCELLED", "VISIT_COMPLETED", "VISIT_INCOMPLETE"].includes(coordination.status)) {
      return errorResponse(409, "INVALID_TRANSITION", "이미 종료된 조율입니다.");
    }
    const items = (coordination.scheduleItems ?? []).map((entry) =>
      entry.result === "SCHEDULED" ? { ...entry, result: "CANCELLED" as const } : entry,
    );
    const anyDone = items.some((entry) => entry.result === "COMPLETED");
    const status = anyDone
      ? "VISIT_COMPLETED"
      : items.some((entry) => entry.result === "NO_SHOW")
        ? "VISIT_INCOMPLETE"
        : "CANCELLED";
    const next = bump(coordination, { status, scheduleItems: items });
    return HttpResponse.json({
      coordinationId: next.coordinationId,
      status: next.status,
      customerId: next.customerId,
      customerName: next.customerName,
      managerMembershipId: next.managerMembershipId,
      periodStartDate: next.periodStartDate,
      periodEndDate: next.periodEndDate,
      candidateProperties: next.candidateProperties.map((entry) => ({
        candidatePropertyId: entry.candidatePropertyId,
        propertyId: entry.propertyId,
        sortOrder: entry.sortOrder,
      })),
      scheduleItems: items.map((entry) => ({
        itemId: entry.itemId,
        candidatePropertyId: entry.candidatePropertyId,
        scheduledStartAt: entry.scheduledStartAt,
        scheduledEndAt: entry.scheduledEndAt,
        result: entry.result,
      })),
      affectedItems: [],
      createdAt: next.createdAt,
      updatedAt: next.updatedAt,
      version: next.version,
      officeId: next.officeId,
    });
  }),

  http.post("/api/visit-coordinations/:id/clone", async ({ params, request }) => {
    const coordination = findCoordination(params.id);
    if (!coordination) return mockErrors.notFound();
    if (coordination.status !== "CANCELLED") {
      return errorResponse(409, "INVALID_TRANSITION", "취소된 조율만 복제할 수 있습니다.");
    }
    const body = (await request.json()) as { periodStartDate: string; periodEndDate: string };
    if (body.periodEndDate < body.periodStartDate) {
      return mockErrors.validation([
        { field: "periodEndDate", message: "종료일은 시작일보다 앞설 수 없습니다." },
      ]);
    }
    const visit = getMockVisitState();
    const coordinationId = visit.nextId;
    const created: MockCoordination = {
      ...coordination,
      coordinationId,
      status: "TIME_COLLECTING",
      periodStartDate: body.periodStartDate,
      periodEndDate: body.periodEndDate,
      scheduleItems: [],
      alternatives: [],
      rescheduleAlert: null,
      customerLink: null,
      customerTimeSlots: [],
      customerRespondedAt: null,
      confirmedScheduleVersion: null,
      createdAt: NOW,
      updatedAt: NOW,
      version: 1,
    };
    setMockVisitState({
      nextId: visit.nextId + 1,
      coordinations: [created, ...visit.coordinations],
    });
    return HttpResponse.json(
      {
        coordinationId,
        status: created.status,
        candidateProperties: created.candidateProperties.map((entry) => ({
          candidatePropertyId: entry.candidatePropertyId,
          propertyId: entry.propertyId,
          sortOrder: entry.sortOrder,
        })),
        officeId: created.officeId,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/visit-coordinations/:id/confirmation-messages", ({ params }) => {
    const coordination = findCoordination(params.id);
    if (!coordination) return mockErrors.notFound();
    if (coordination.confirmedScheduleVersion === null) {
      return errorResponse(409, "INVALID_TRANSITION", "확정된 일정이 없습니다.");
    }
    return HttpResponse.json({
      scheduleVersion: coordination.confirmedScheduleVersion,
      customerMessage: "11월 12일 오전 10시에 국민대 앞 아파트를 방문합니다.",
      approverMessages: coordination.candidateProperties
        .filter((entry) => !entry.crossOffice)
        .map((entry) => ({
          candidatePropertyId: entry.candidatePropertyId,
          approvalId: 7001,
          approverName: "박소유",
          message: `${entry.propertyName} 방문 일정을 안내드립니다.`,
        })),
    });
  }),

  http.get("/api/visit-coordinations/:id/confirmation-deliveries", ({ params }) => {
    if (!findCoordination(params.id)) return mockErrors.notFound();
    return HttpResponse.json({ items: state.deliveries });
  }),

  http.post("/api/visit-coordinations/:id/confirmation-deliveries", async ({ params, request }) => {
    const coordination = findCoordination(params.id);
    if (!coordination) return mockErrors.notFound();
    const body = (await request.json()) as {
      recipientType: "CUSTOMER" | "APPROVER";
      scheduleVersion: number;
      delivered: boolean;
      channel?: string | null;
      deliveredAt?: string | null;
      candidatePropertyId?: number | null;
    };
    const target = coordination.candidateProperties.find(
      (entry) => entry.candidatePropertyId === body.candidatePropertyId,
    );
    if (body.recipientType === "APPROVER" && target?.crossOffice) {
      return errorResponse(
        409,
        "INVALID_TRANSITION",
        "허용받은 매물은 승인자 전달 기록을 받지 않습니다.",
      );
    }
    const delivery: MockDelivery = {
      deliveryId: state.nextId++,
      scheduleVersion: body.scheduleVersion,
      recipientType: body.recipientType,
      candidatePropertyId: body.candidatePropertyId ?? null,
      delivered: body.delivered,
      channel: body.channel ?? null,
      deliveredAt: body.deliveredAt ?? null,
      createdAt: NOW,
    };
    state.deliveries = [...state.deliveries, delivery];
    return HttpResponse.json(
      {
        ...delivery,
        coordinationId: coordination.coordinationId,
        officeId: coordination.officeId,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/visit-schedule-items/:itemId/assistant-notices", ({ params }) => {
    const found = locate(params.itemId);
    if (!found) return mockErrors.notFound();
    return HttpResponse.json({
      items: state.notices.filter((entry) => entry.scheduleItemId === found.item.itemId),
      requiredRecipients: state.requiredRecipients,
    });
  }),

  http.post("/api/visit-schedule-items/:itemId/assistant-notice", async ({ params, request }) => {
    const found = locate(params.itemId);
    if (!found) return mockErrors.notFound();
    const body = (await request.json()) as {
      recipientType: string;
      recipientName: string;
      noticeMethod: string;
      notifiedAt?: string | null;
      missingExceptionReason?: string | null;
      followupAction?: string | null;
    };
    const hasTime = Boolean(body.notifiedAt);
    const hasReason = Boolean(body.missingExceptionReason);
    if (hasTime === hasReason) {
      return mockErrors.validation([
        { field: "notifiedAt", message: "실제 시각과 예외 사유 중 하나만 입력해 주세요." },
      ]);
    }
    const notice: MockNotice = {
      noticeId: state.nextId++,
      scheduleItemId: found.item.itemId,
      recipientType: body.recipientType,
      recipientName: body.recipientName,
      noticeMethod: body.noticeMethod,
      notifiedAt: body.notifiedAt ?? null,
      missingExceptionReason: body.missingExceptionReason ?? null,
      followupAction: body.followupAction ?? null,
      recordedAfterTheFact: false,
      confirmedAt: null,
    };
    state.notices = [...state.notices, notice];
    state.requiredRecipients = state.requiredRecipients.map((entry) =>
      entry.recipientType === body.recipientType ? { ...entry, recorded: true } : entry,
    );
    return HttpResponse.json(
      { ...notice, recordedAt: NOW, recordedByMembershipId: 3 },
      { status: 201 },
    );
  }),

  http.post("/api/visit-assistant-notices/:noticeId/confirm", async ({ params, request }) => {
    if (getMockVisitState().callerRole === "DEPUTY") return mockErrors.forbidden();
    const notice = state.notices.find((entry) => String(entry.noticeId) === params.noticeId);
    if (!notice) return mockErrors.notFound();
    if (notice.confirmedAt) {
      return errorResponse(409, "INVALID_TRANSITION", "이미 확인한 고지입니다.");
    }
    const body = (await request.json().catch(() => ({}))) as {
      supervisorAdditionalNotice?: string;
    };
    state.notices = state.notices.map((entry) =>
      entry.noticeId === notice.noticeId ? { ...entry, confirmedAt: NOW } : entry,
    );
    return HttpResponse.json({
      ...notice,
      recordedAt: NOW,
      recordedByMembershipId: 3,
      confirmedByMembershipId: 1,
      confirmedAt: NOW,
      supervisorAdditionalNotice: body.supervisorAdditionalNotice ?? null,
      supervisorAdditionalNoticedAt: body.supervisorAdditionalNotice ? NOW : null,
    });
  }),

  http.get("/api/visit-assistant-notices", ({ request }) => {
    if (getMockVisitState().callerRole !== "OWNER") return mockErrors.forbidden();
    const rows = state.notices.map((entry) => ({
      noticeId: entry.noticeId,
      scheduleItemId: entry.scheduleItemId,
      assistantMembershipId: 3,
      recipientType: entry.recipientType,
      notifiedAt: entry.notifiedAt,
      recordedAfterTheFact: entry.recordedAfterTheFact,
      confirmedAt: entry.confirmedAt,
    }));
    return HttpResponse.json(pageOf(rows, new URL(request.url)));
  }),

  http.get("/api/public/customer-visit-links/:token", ({ params }) => {
    if (params.token === MOCK_CUSTOMER_EXPIRED_TOKEN) {
      return errorResponse(410, "PUBLIC_LINK_EXPIRED", "링크가 만료되었습니다.");
    }
    if (params.token !== MOCK_CUSTOMER_TOKEN) {
      return errorResponse(404, "PUBLIC_LINK_NOT_FOUND", "링크를 찾을 수 없습니다.");
    }
    return HttpResponse.json({
      ...state.customerLink,
      submittedTimeSlots: state.customerSubmitted,
    });
  }),

  http.post(
    "/api/public/customer-visit-links/:token/available-times",
    async ({ params, request }) => {
      if (params.token !== MOCK_CUSTOMER_TOKEN) {
        return errorResponse(404, "PUBLIC_LINK_NOT_FOUND", "링크를 찾을 수 없습니다.");
      }
      const body = (await request.json()) as {
        timeSlots: Array<{ startsAt: string; endsAt: string }>;
        acknowledgedNoticeVersion: string;
      };
      if (body.acknowledgedNoticeVersion !== state.customerLink.privacyNotice.noticeVersion) {
        return errorResponse(409, "NOTICE_VERSION_CHANGED", "개인정보 안내가 바뀌었습니다.");
      }
      if (body.timeSlots.length === 0) {
        return mockErrors.validation([
          { field: "timeSlots", message: "시간을 한 개 이상 보내 주세요." },
        ]);
      }
      state.customerSubmitted = body.timeSlots;
      state.customerLink = {
        ...state.customerLink,
        responseVersion: state.customerLink.responseVersion + 1,
      };
      return HttpResponse.json({
        coordinationId: 801,
        responseVersion: state.customerLink.responseVersion,
        submittedAt: NOW,
      });
    },
  ),

  http.get("/api/public/customer-visit-links/:token/confirmed", ({ params }) => {
    if (params.token !== MOCK_CUSTOMER_TOKEN) {
      return errorResponse(404, "PUBLIC_LINK_NOT_FOUND", "링크를 찾을 수 없습니다.");
    }
    if (state.customerConfirmed === "NONE") {
      return errorResponse(404, "RESOURCE_NOT_FOUND", "확정된 일정이 없습니다.");
    }
    return HttpResponse.json(state.customerConfirmed);
  }),
];
