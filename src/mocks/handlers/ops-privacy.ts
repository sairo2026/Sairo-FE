import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockOperator, requireMockOps, requireMockStepUp } from "./ops-session";

const SELF = 1;
const PRIVACY = ["PRIVACY"] as const;
const DAY = 86_400_000;

function at(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function selfId(): number {
  return getMockOperator()?.operatorId ?? SELF;
}

function selfName(): string {
  return getMockOperator()?.name ?? "운영 김사이";
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null ? Object.fromEntries(Object.entries(body)) : {};
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

function invalid(message = "지금 상태에서는 할 수 없는 처리입니다.") {
  return errorResponse(409, "INVALID_TRANSITION", message);
}

type PrivacyEvent = {
  eventId: number;
  eventType: string;
  previousStatus: string | null;
  newStatus: string;
  actionDetail: string;
  actorOperatorName: string | null;
  occurredAt: string;
};

type MockPrivacy = {
  requestId: number;
  officeId: number | null;
  requestType: string;
  identityStatus: "PENDING" | "VERIFIED" | "FAILED";
  status: string;
  receivedAt: string;
  legalBasis: string;
  requestScope: string;
  legalDueAt: string;
  internalDueAt: string;
  decisionReason: string | null;
  completionEvidence: string | null;
  assignedOperatorId: number | null;
  assignedOperatorName: string | null;
  completedAt: string | null;
  events: PrivacyEvent[];
  version: number;
  handlerType: "SAIRO" | "OFFICE";
};

const BASIS = "개인정보 보호법 제35조 열람 요구, 10일 이내 처리";

function privacy(
  requestId: number,
  requestType: string,
  status: string,
  patch: Partial<MockPrivacy> = {},
): MockPrivacy {
  return {
    requestId,
    officeId: null,
    requestType,
    identityStatus: "VERIFIED",
    status,
    receivedAt: at(-3 * DAY),
    legalBasis: BASIS,
    requestScope: "본인 계정 정보",
    legalDueAt: at(7 * DAY),
    internalDueAt: at(4 * DAY),
    decisionReason: null,
    completionEvidence: null,
    assignedOperatorId: null,
    assignedOperatorName: null,
    completedAt: null,
    events: [
      {
        eventId: requestId * 10,
        eventType: "RECEIVE",
        previousStatus: null,
        newStatus: "RECEIVED",
        actionDetail: "요청 접수",
        actorOperatorName: null,
        occurredAt: at(-3 * DAY),
      },
    ],
    version: 2,
    handlerType: "SAIRO",
    ...patch,
  };
}

function seedPrivacy(): MockPrivacy[] {
  const owner = { assignedOperatorId: 7, assignedOperatorName: "박개인" };
  return [
    privacy(501, "ACCESS", "RECEIVED", { identityStatus: "PENDING" }),
    privacy(502, "DELETION", "REVIEWING", {
      ...owner,
      internalDueAt: at(-1 * DAY),
      legalDueAt: at(3 * DAY),
      officeId: 42,
      handlerType: "OFFICE",
    }),
    privacy(503, "CORRECTION", "RECEIVED", {
      internalDueAt: at(-5 * DAY),
      legalDueAt: at(-1 * DAY),
    }),
    privacy(504, "ACCESS", "WAITING_FOR_INFO", { ...owner, identityStatus: "PENDING" }),
    privacy(505, "DELETION", "APPROVED", { ...owner, decisionReason: "삭제 요청을 승인합니다." }),
    privacy(506, "SUSPENSION", "EXECUTING", { ...owner, decisionReason: "처리를 정지합니다." }),
    privacy(507, "PORTABILITY", "COMPLETED", {
      ...owner,
      decisionReason: "이전 요청을 승인합니다.",
      completionEvidence: "PRV-2026-0911-03",
      completedAt: at(-1 * DAY),
    }),
    privacy(508, "WITHDRAWAL", "REJECTED", {
      ...owner,
      decisionReason: "요청 내용을 확인할 수 없어 거절합니다.",
    }),
  ];
}

function dueStateOf(row: MockPrivacy): string | null {
  if (row.status === "COMPLETED" || row.status === "REJECTED") return null;
  const now = Date.now();
  if (now >= Date.parse(row.legalDueAt)) return "OVERDUE";
  if (now >= Date.parse(row.internalDueAt)) return "APPROACHING";
  return "ON_TRACK";
}

function listItem(row: MockPrivacy) {
  return {
    requestId: row.requestId,
    officeId: row.officeId,
    requestType: row.requestType,
    identityStatus: row.identityStatus,
    status: row.status,
    receivedAt: row.receivedAt,
    legalBasis: row.legalBasis,
    requestScope: row.requestScope,
    legalDueAt: row.legalDueAt,
    internalDueAt: row.internalDueAt,
    dueState: dueStateOf(row),
    decisionReason: row.decisionReason,
    assignedOperatorId: row.assignedOperatorId,
    assignedOperatorName: row.assignedOperatorName,
    completedAt: row.completedAt,
  };
}

const DECISION_FROM = ["RECEIVED", "REVIEWING"];
const ACTION_RULES: Record<string, { from: string[] | null; to: string; identity: boolean }> = {
  FORWARD: { from: null, to: "FORWARDED", identity: false },
  REQUEST_COOPERATION: { from: null, to: "REVIEWING", identity: false },
  REQUEST_SUPPLEMENT: { from: null, to: "WAITING_FOR_INFO", identity: false },
  APPROVE: { from: DECISION_FROM, to: "APPROVED", identity: true },
  RESTRICT: { from: DECISION_FROM, to: "PARTIALLY_RESTRICTED", identity: true },
  REJECT: { from: DECISION_FROM, to: "REJECTED", identity: false },
  EXECUTE: { from: ["APPROVED", "PARTIALLY_RESTRICTED"], to: "EXECUTING", identity: false },
  COMPLETE: { from: ["RECEIVED", "REVIEWING", "EXECUTING"], to: "COMPLETED", identity: false },
};

type MockReturnGrant = {
  grantId: number;
  officeId: number;
  grantedToUserId: number;
  grantedAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

type MockArchiveGrant = {
  grantId: number;
  officeId: number;
  grantedToUserId: number;
  contractReference: string | null;
  grantedAt: string;
  expiresAt: string | null;
  terminatedAt: string | null;
};

function seedReturnGrants(): MockReturnGrant[] {
  return [
    {
      grantId: 12,
      officeId: 42,
      grantedToUserId: 31,
      grantedAt: at(-5 * DAY),
      expiresAt: at(25 * DAY),
      revokedAt: null,
    },
    {
      grantId: 11,
      officeId: 43,
      grantedToUserId: 32,
      grantedAt: at(-40 * DAY),
      expiresAt: at(-10 * DAY),
      revokedAt: at(-20 * DAY),
    },
    {
      grantId: 10,
      officeId: 44,
      grantedToUserId: 33,
      grantedAt: at(-60 * DAY),
      expiresAt: at(-30 * DAY),
      revokedAt: null,
    },
  ];
}

function seedArchiveGrants(): MockArchiveGrant[] {
  return [
    {
      grantId: 4,
      officeId: 42,
      grantedToUserId: 31,
      contractReference: "ARC-2026-001",
      grantedAt: at(-30 * DAY),
      expiresAt: at(300 * DAY),
      terminatedAt: null,
    },
    {
      grantId: 3,
      officeId: 43,
      grantedToUserId: 32,
      contractReference: "ARC-2025-014",
      grantedAt: at(-300 * DAY),
      expiresAt: null,
      terminatedAt: at(-100 * DAY),
    },
    {
      grantId: 2,
      officeId: 44,
      grantedToUserId: 33,
      contractReference: null,
      grantedAt: at(-100 * DAY),
      expiresAt: null,
      terminatedAt: null,
    },
  ];
}

type StoreResult = "PENDING" | "SUCCESS" | "FAILED" | "EXCLUDED";

type MockDeletion = {
  queueId: number;
  targetType: string;
  targetId: number;
  officeId: number | null;
  reason: string;
  scheduledAt: string;
  executedAt: string | null;
  executedByOperatorId: number | null;
  targetCount: number;
  excludedCount: number;
  result: "SUCCESS" | "FAILED" | "EXCLUDED" | null;
  storageResult: StoreResult | null;
  searchIndexResult: StoreResult | null;
  fileResult: StoreResult | null;
  temporaryExportResult: StoreResult | null;
  backupExpiresAt: string | null;
  retryCount: number;
  exclusionReason: string | null;
  holdApprovedByOperatorId: number | null;
  holdExpiresAt: string | null;
  exclusionReviewedAt: string | null;
  verifiedByOperatorId: number | null;
  verifiedAt: string | null;
  verificationEvidence: string | null;
  cancelledAt: string | null;
  cancelledByOperatorId: number | null;
  cancelReason: string | null;
  createdAt: string;
};

function deletion(queueId: number, patch: Partial<MockDeletion> = {}): MockDeletion {
  return {
    queueId,
    targetType: "CUSTOMER",
    targetId: queueId + 100,
    officeId: 42,
    reason: "보관 기한 만료",
    scheduledAt: at(2 * DAY),
    executedAt: null,
    executedByOperatorId: null,
    targetCount: 24,
    excludedCount: 3,
    result: null,
    storageResult: "PENDING",
    searchIndexResult: "PENDING",
    fileResult: "PENDING",
    temporaryExportResult: "PENDING",
    backupExpiresAt: null,
    retryCount: 0,
    exclusionReason: null,
    holdApprovedByOperatorId: null,
    holdExpiresAt: null,
    exclusionReviewedAt: null,
    verifiedByOperatorId: null,
    verifiedAt: null,
    verificationEvidence: null,
    cancelledAt: null,
    cancelledByOperatorId: null,
    cancelReason: null,
    createdAt: at(-10 * DAY),
    ...patch,
  };
}

const executedResults = {
  executedAt: at(-1 * DAY),
  storageResult: "SUCCESS" as const,
  searchIndexResult: "SUCCESS" as const,
  fileResult: "SUCCESS" as const,
  temporaryExportResult: "SUCCESS" as const,
};

function seedDeletion(): MockDeletion[] {
  return [
    deletion(701),
    deletion(702, { targetType: "PROPERTY", reason: "계약 종료 후 보관 기한 만료" }),
    deletion(710, {
      targetType: "OFFICE_DATA",
      targetId: 42,
      reason: "사무소 종료 후 보관 기한 만료",
    }),
    deletion(711, {
      targetType: "BILLING_RECORD",
      targetId: 0,
      officeId: null,
      reason: "구독 종료 후 보관 기한 만료",
    }),
    deletion(703, { ...executedResults, executedByOperatorId: SELF }),
    deletion(704, { ...executedResults, executedByOperatorId: 9 }),
    deletion(705, {
      ...executedResults,
      executedByOperatorId: 9,
      result: "SUCCESS",
      verifiedAt: at(-12 * 3_600_000),
      verifiedByOperatorId: 9,
      verificationEvidence: "저장소 점검 기록",
      backupExpiresAt: at(30 * DAY),
    }),
    deletion(706, { cancelledAt: at(-2 * DAY) }),
    deletion(707, {
      ...executedResults,
      executedByOperatorId: 9,
      fileResult: "FAILED",
      retryCount: 2,
    }),
  ];
}

const state = {
  privacy: seedPrivacy(),
  returnGrants: seedReturnGrants(),
  archiveGrants: seedArchiveGrants(),
  deletion: seedDeletion(),
  nextEventId: 9000,
  nextGrantId: 100,
  excluded: new Set<number>(),
};

export function resetMockPrivacy(): void {
  state.privacy = seedPrivacy();
  state.returnGrants = seedReturnGrants();
  state.archiveGrants = seedArchiveGrants();
  state.deletion = seedDeletion();
  state.nextEventId = 9000;
  state.nextGrantId = 100;
  state.excluded = new Set();
}

function findPrivacy(id: unknown): MockPrivacy | undefined {
  return state.privacy.find((row) => String(row.requestId) === String(id));
}

function findDeletion(id: unknown): MockDeletion | undefined {
  return state.deletion.find((row) => String(row.queueId) === String(id));
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

const RESULTS: readonly string[] = ["SUCCESS", "FAILED", "EXCLUDED"];

function transferValidation(body: Record<string, unknown>, archive: boolean) {
  const errors: { field: string; message: string }[] = [];
  const userId = body.newGranteeUserId;
  if (typeof userId !== "number" || !Number.isInteger(userId) || userId <= 0) {
    errors.push({ field: "newGranteeUserId", message: "새 권한자를 확인해 주세요." });
  }
  const required = ["identityEvidenceReference", "registrationRelationReference", "reason"];
  if (archive) required.push("contractReference");
  for (const field of required) {
    if (nonEmpty(body[field]) === null) errors.push({ field, message: "필수 입력입니다." });
  }
  return errors;
}

export const opsPrivacyHandlers: RequestHandler[] = [
  http.get("/api/ops/privacy-requests", ({ request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("requestType");
    const rows = state.privacy
      .filter((row) => !status || row.status === status)
      .filter((row) => !type || row.requestType === type)
      .sort((a, b) => Date.parse(a.legalDueAt) - Date.parse(b.legalDueAt));
    return HttpResponse.json(pageOf(rows.map(listItem), url));
  }),

  http.get("/api/ops/privacy-requests/:id", ({ params }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const row = findPrivacy(params.id);
    if (!row) return mockErrors.notFound();
    return HttpResponse.json({
      ...listItem(row),
      completionEvidence: row.completionEvidence,
      events: row.events,
      version: row.version,
      handlerType: row.handlerType,
    });
  }),

  http.post("/api/ops/privacy-requests/:id/process", async ({ params, request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const row = findPrivacy(params.id);
    if (!row) return mockErrors.notFound();
    const header = request.headers.get("If-Match");
    if (header !== null && Number(header) !== row.version) {
      return mockErrors.versionConflict(row.version);
    }
    const body = await readBody(request);
    const action = typeof body.action === "string" ? body.action : "";
    const rule = ACTION_RULES[action];
    const note = nonEmpty(body.note);
    const evidence = nonEmpty(body.evidenceReference);
    if (!rule)
      return mockErrors.validation([{ field: "action", message: "처리 단계를 확인해 주세요." }]);
    if ((action === "RESTRICT" || action === "REJECT") && note === null) {
      return mockErrors.validation([{ field: "note", message: "결정 사유를 입력해 주세요." }]);
    }
    if (action === "COMPLETE" && evidence === null) {
      return mockErrors.validation([
        { field: "evidenceReference", message: "완료 증빙 위치를 입력해 주세요." },
      ]);
    }
    if (body.identityStatus === "VERIFIED" || body.identityStatus === "FAILED") {
      row.identityStatus = body.identityStatus;
    }
    const terminal = row.status === "COMPLETED" || row.status === "REJECTED";
    if (terminal || (rule.from !== null && !rule.from.includes(row.status))) return invalid();
    if (rule.identity && row.identityStatus !== "VERIFIED") {
      return errorResponse(
        409,
        "IDENTITY_NOT_VERIFIED",
        "요청자의 본인확인이 완료되지 않았습니다.",
      );
    }
    const previous = row.status;
    row.status = rule.to;
    if (row.assignedOperatorId === null) {
      row.assignedOperatorId = selfId();
      row.assignedOperatorName = selfName();
    }
    if (action === "APPROVE" || action === "RESTRICT" || action === "REJECT") {
      row.decisionReason = note;
    }
    if (action === "COMPLETE") {
      row.completionEvidence = evidence;
      row.completedAt = new Date().toISOString();
    }
    const eventId = state.nextEventId++;
    const occurredAt = new Date().toISOString();
    row.events.push({
      eventId,
      eventType: action,
      previousStatus: previous,
      newStatus: row.status,
      actionDetail: note ?? evidence ?? action,
      actorOperatorName: selfName(),
      occurredAt,
    });
    row.version += 1;
    return HttpResponse.json({ requestId: row.requestId, eventId, status: row.status, occurredAt });
  }),

  http.get("/api/ops/return-grants", ({ request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    return HttpResponse.json(pageOf(state.returnGrants, new URL(request.url)));
  }),

  http.get("/api/ops/archive-grants", ({ request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    return HttpResponse.json(pageOf(state.archiveGrants, new URL(request.url)));
  }),

  http.post("/api/ops/return-grants/:id/transfer", async ({ params, request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const grant = state.returnGrants.find((row) => String(row.grantId) === String(params.id));
    if (!grant) return mockErrors.notFound();
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    const body = await readBody(request);
    const errors = transferValidation(body, false);
    if (errors.length > 0) return mockErrors.validation(errors);
    if (grant.revokedAt !== null || Date.parse(grant.expiresAt) <= Date.now()) return invalid();
    const now = new Date();
    grant.revokedAt = now.toISOString();
    const created: MockReturnGrant = {
      grantId: state.nextGrantId++,
      officeId: grant.officeId,
      grantedToUserId: Number(body.newGranteeUserId),
      grantedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 30 * DAY).toISOString(),
      revokedAt: null,
    };
    state.returnGrants.unshift(created);
    return HttpResponse.json({
      previousGrantId: grant.grantId,
      revokedAt: grant.revokedAt,
      newGrantId: created.grantId,
      newGranteeUserId: created.grantedToUserId,
      grantedAt: created.grantedAt,
      expiresAt: created.expiresAt,
    });
  }),

  http.post("/api/ops/archive-grants/:id/transfer", async ({ params, request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const grant = state.archiveGrants.find((row) => String(row.grantId) === String(params.id));
    if (!grant) return mockErrors.notFound();
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    const body = await readBody(request);
    const errors = transferValidation(body, true);
    if (errors.length > 0) return mockErrors.validation(errors);
    if (
      grant.terminatedAt !== null ||
      (grant.expiresAt && Date.parse(grant.expiresAt) <= Date.now())
    ) {
      return invalid();
    }
    const now = new Date();
    grant.terminatedAt = now.toISOString();
    const created: MockArchiveGrant = {
      grantId: state.nextGrantId++,
      officeId: grant.officeId,
      grantedToUserId: Number(body.newGranteeUserId),
      contractReference: nonEmpty(body.contractReference),
      grantedAt: now.toISOString(),
      expiresAt: null,
      terminatedAt: null,
    };
    state.archiveGrants.unshift(created);
    return HttpResponse.json({
      previousGrantId: grant.grantId,
      terminatedAt: grant.terminatedAt,
      newGrantId: created.grantId,
      newGranteeUserId: created.grantedToUserId,
      grantedAt: created.grantedAt,
      expiresAt: null,
    });
  }),

  http.get("/api/ops/deletion-queue", ({ request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const queueId = new URL(request.url).searchParams.get("queueId");
    const targetType = new URL(request.url).searchParams.get("targetType");
    const rows = [...state.deletion]
      .filter((row) => !queueId || String(row.queueId) === queueId)
      .filter((row) => !targetType || row.targetType === targetType)
      .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
    return HttpResponse.json(pageOf(rows, new URL(request.url)));
  }),

  http.get("/api/ops/deletion-queue/:id", ({ params }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const row = findDeletion(params.id);
    return row ? HttpResponse.json(row) : mockErrors.notFound();
  }),

  http.get("/api/ops/deletion-queue/:id/preview", ({ params }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const row = findDeletion(params.id);
    if (!row) return mockErrors.notFound();
    const excluded = state.excluded.has(row.queueId);
    return HttpResponse.json({
      targetCount: row.targetCount,
      excludedCount: excluded ? row.excludedCount + 1 : row.excludedCount,
      storageTargets: [{ targetType: row.targetType, targetId: row.targetId }],
      searchIndexTargets: [{ targetType: row.targetType, targetId: row.targetId }],
      fileTargets: [{ objectKey: "private/object-key" }],
      temporaryExportTargets: [{ objectKey: "exports/object-key" }],
      holdReasons: row.excludedCount > 0 ? ["법정 보존 기간이 남은 계약 서류"] : [],
    });
  }),

  http.post("/api/ops/deletion-queue/:id/exclude", async ({ params, request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const row = findDeletion(params.id);
    if (!row) return mockErrors.notFound();
    const body = await readBody(request);
    const reason = nonEmpty(body.exclusionReason);
    const hold = typeof body.holdExpiresAt === "string" ? Date.parse(body.holdExpiresAt) : NaN;
    const review =
      typeof body.exclusionReviewedAt === "string" ? Date.parse(body.exclusionReviewedAt) : NaN;
    const approver = body.approvedByOperatorId;
    const errors: { field: string; message: string }[] = [];
    if (reason === null)
      errors.push({ field: "exclusionReason", message: "근거를 입력해 주세요." });
    if (!Number.isFinite(hold))
      errors.push({ field: "holdExpiresAt", message: "만료 시각을 확인해 주세요." });
    if (!Number.isFinite(review)) {
      errors.push({ field: "exclusionReviewedAt", message: "재검토 예정일을 확인해 주세요." });
    }
    if (typeof approver !== "number" || !Number.isInteger(approver) || approver <= 0) {
      errors.push({ field: "approvedByOperatorId", message: "승인자를 확인해 주세요." });
    }
    if (errors.length > 0) return mockErrors.validation(errors);
    if (approver === selfId()) {
      return errorResponse(403, "SELF_APPROVAL_FORBIDDEN", "승인자는 실행자와 달라야 합니다.");
    }
    if (row.executedAt !== null || row.cancelledAt !== null) return invalid();
    state.excluded.add(row.queueId);
    row.exclusionReason = reason;
    row.holdExpiresAt = String(body.holdExpiresAt);
    row.exclusionReviewedAt = String(body.exclusionReviewedAt);
    row.holdApprovedByOperatorId = approver as number;
    return HttpResponse.json({
      queueId: row.queueId,
      result: "EXCLUDED",
      exclusionReason: reason,
      holdExpiresAt: body.holdExpiresAt,
      exclusionReviewedAt: body.exclusionReviewedAt,
    });
  }),

  http.post("/api/ops/deletion-queue/:id/cancel", async ({ params, request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const row = findDeletion(params.id);
    if (!row) return mockErrors.notFound();
    const body = await readBody(request);
    if (nonEmpty(body.reason) === null) {
      return mockErrors.validation([{ field: "reason", message: "취소 사유를 입력해 주세요." }]);
    }
    if (row.executedAt !== null || row.cancelledAt !== null) return invalid();
    row.cancelledAt = new Date().toISOString();
    row.cancelledByOperatorId = selfId();
    row.cancelReason = nonEmpty(body.reason);
    return HttpResponse.json({
      queueId: row.queueId,
      cancelledAt: row.cancelledAt,
      cancelledByOperatorId: selfId(),
    });
  }),

  http.post("/api/ops/deletion-queue/:id/execute", ({ params }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const row = findDeletion(params.id);
    if (!row) return mockErrors.notFound();
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    if (row.cancelledAt !== null || row.executedAt !== null) return invalid();
    row.executedAt = new Date().toISOString();
    row.executedByOperatorId = selfId();
    row.storageResult = "SUCCESS";
    row.searchIndexResult = "SUCCESS";
    row.fileResult = "SUCCESS";
    row.temporaryExportResult = "SUCCESS";
    return HttpResponse.json(
      {
        queueId: row.queueId,
        result: null,
        executedAt: row.executedAt,
        storageResult: row.storageResult,
        searchIndexResult: row.searchIndexResult,
        fileResult: row.fileResult,
        temporaryExportResult: row.temporaryExportResult,
        retryCount: row.retryCount,
        verifiedAt: null,
      },
      { status: 202 },
    );
  }),

  http.post("/api/ops/deletion-queue/:id/verify", async ({ params, request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const row = findDeletion(params.id);
    if (!row) return mockErrors.notFound();
    const body = await readBody(request);
    if (row.executedAt === null || row.cancelledAt !== null || row.verifiedAt !== null) {
      return invalid();
    }
    if (row.executedByOperatorId === selfId()) {
      return errorResponse(
        403,
        "SELF_APPROVAL_FORBIDDEN",
        "실행자는 같은 건을 검증할 수 없습니다.",
      );
    }
    if (nonEmpty(body.evidence) === null) {
      return mockErrors.validation([{ field: "evidence", message: "증빙을 입력해 주세요." }]);
    }
    const keys = [
      "storageResult",
      "searchIndexResult",
      "fileResult",
      "temporaryExportResult",
    ] as const;
    const values = keys.map((key) => body[key]);
    if (!values.every((value) => typeof value === "string" && RESULTS.includes(value))) {
      return errorResponse(
        409,
        "VERIFICATION_INCOMPLETE",
        "저장소별 검증 결과가 모두 입력되어야 합니다.",
      );
    }
    const [storage, search, file, temp] = values as StoreResult[];
    row.storageResult = storage ?? null;
    row.searchIndexResult = search ?? null;
    row.fileResult = file ?? null;
    row.temporaryExportResult = temp ?? null;
    row.backupExpiresAt = typeof body.backupExpiresAt === "string" ? body.backupExpiresAt : null;
    row.verifiedAt = new Date().toISOString();
    row.verifiedByOperatorId = selfId();
    row.verificationEvidence = nonEmpty(body.evidence);
    row.result = values.some((value) => value === "FAILED") ? "FAILED" : "SUCCESS";
    return HttpResponse.json({
      queueId: row.queueId,
      result: row.result,
      storageResult: row.storageResult,
      searchIndexResult: row.searchIndexResult,
      fileResult: row.fileResult,
      temporaryExportResult: row.temporaryExportResult,
      backupExpiresAt: row.backupExpiresAt,
      verifiedByOperatorId: row.verifiedByOperatorId,
      verifiedAt: row.verifiedAt,
    });
  }),
];
