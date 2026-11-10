import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import { jobKindRole } from "@/features/ops/system-jobs/system-jobs-model";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockOperator, requireMockOps } from "./ops-session";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const HEX64 = /^[0-9a-fA-F]{64}$/;

function at(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function selfId(): number {
  return getMockOperator()?.operatorId ?? 1;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? Object.fromEntries(Object.entries(body))
    : {};
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

function bad(field: string, message: string) {
  return mockErrors.validation([{ field, message }]);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function optText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function numericId(value: string | readonly string[] | undefined): number {
  return Number(Array.isArray(value) ? value[0] : value);
}

type JobRun = {
  runId: number;
  jobName: string;
  officeId: number | null;
  officeName: string | null;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  scheduledAt: string | null;
  startedAt: string;
  finishedAt: string | null;
  attemptCount: number;
  errorCode: string | null;
  nextRunAt: string | null;
  assignedOperatorId: number | null;
  assignedOperatorName: string | null;
};

type IncidentStatus = "DETECTED" | "CONFIRMED" | "RESPONDING" | "RECOVERED" | "CLOSED";

type Incident = {
  incidentId: number;
  title: string;
  affectedServices: string[];
  affectedOffices: number[];
  status: IncidentStatus;
  detectedAt: string;
  startedAt: string | null;
  recoveredAt: string | null;
  closedAt: string | null;
  assignedOperatorId: number | null;
  rootCause: string | null;
  responseActions: string | null;
  customerNotice: string | null;
  preventionTasks: string | null;
  summary: string | null;
};

type PrivacyIncident = {
  privacyIncidentId: number;
  incidentLogId: number;
  affectedScope: string;
  reportRequirement: string;
  noticeRequirement: string;
  reportDueAt: string | null;
  noticeDueAt: string | null;
  responseEvidence: string | null;
  assignedOperatorId: number;
  createdAt: string;
};

type Integration = {
  integrationId: number;
  environment: "TEST" | "PRODUCTION";
  provider: string;
  functionCode: string;
  enabled: boolean;
  secretReferenceId: string;
  maskedConnection: string;
  processingRegion: string | null;
  retentionPolicy: string;
  contractStatus: "PENDING" | "SIGNED" | "EXPIRED" | "TERMINATED";
  consentStatus: "NOT_REQUIRED" | "PENDING" | "GRANTED" | "WITHDRAWN";
  contractNoticeReviewedAt: string | null;
  lastCheckResult: "SUCCESS" | "FAILED" | "NOT_TESTED" | null;
  lastSuccessAt: string | null;
  assignedOperatorId: number | null;
  approvedByOperatorId: number;
};

type ContractCopy = {
  copyId: number;
  integrationId: number;
  documentKind: string;
  versionLabel: string;
  signedOn: string | null;
  validUntil: string | null;
  contentSha256: string;
  subprocessorChangeNotifiedAt: string | null;
  uploadedByOperatorId: number;
  uploadedAt: string;
  retentionUntil: string | null;
};

type RetentionRule = {
  ruleCode: string;
  dataGroupLabel: string;
  retentionDays: number;
  anchorEvent: string;
  basisNote: string;
  status: "ASSUMPTION" | "LAWYER_CONFIRMED" | "ADVISOR_CONFIRMED";
  effectiveFrom: string;
  version: number;
};

type KakaoEvent = {
  eventId: number;
  direction: "OUTBOUND_CALL" | "INBOUND_WEBHOOK";
  status: string;
  attemptCount: number;
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
  referrerType: string | null;
  userId: number | null;
  occurredAt: string;
  completedAt: string | null;
};

type TermsResult = "MATCH" | "MISMATCH" | "ERROR";

type TermsItem = {
  termsCode: string;
  version: string;
  status: "ACTIVE" | "SCHEDULED";
  effectiveAt: string;
  lastCheckedAt: string | null;
  lastResult: TermsResult | null;
};

type AuthorityRequest = {
  requestId: number;
  receivedAt: string;
  agencyType: string;
  agencyName: string;
  documentReference: string | null;
  legalBasisNote: string;
  targetOfficeId: number | null;
  targetUserId: number | null;
  requestedItems: string;
  decision: string;
  providedItems: string | null;
  providedAt: string | null;
  officeNoticeStatus: string;
  recordedByOperatorId: number;
  approvedByOperatorId: number | null;
  closedAt: string | null;
  retentionUntil: string | null;
};

type MonitorState = {
  jobs: JobRun[];
  incidents: Incident[];
  privacyIncidents: PrivacyIncident[];
  integrations: Integration[];
  failingChecks: Set<number>;
  companyInfoTested: boolean;
  copies: ContractCopy[];
  rules: RetentionRule[];
  kakao: KakaoEvent[];
  terms: TermsItem[];
  termsOutcome: Record<string, TermsResult>;
  authority: AuthorityRequest[];
};

function job(runId: number, jobName: string, patch: Partial<JobRun> = {}): JobRun {
  return {
    runId,
    jobName,
    officeId: null,
    officeName: null,
    status: "FAILED",
    scheduledAt: at(-2 * DAY),
    startedAt: at(-2 * DAY),
    finishedAt: at(-2 * DAY + 60_000),
    attemptCount: 1,
    errorCode: "TIMEOUT",
    nextRunAt: null,
    assignedOperatorId: null,
    assignedOperatorName: null,
    ...patch,
  };
}

function seedJobs(): JobRun[] {
  return [
    job(101, "MIGRATION_EXECUTE", {
      officeId: 42,
      officeName: "한빛공인중개사",
      attemptCount: 2,
      errorCode: "MAPPING_TIMEOUT",
      nextRunAt: at(DAY),
      assignedOperatorId: 5,
      assignedOperatorName: "김이전",
    }),
    job(102, "PRIVACY_DELETION", { status: "SUCCESS", errorCode: null }),
    job(103, "BILLING_RETRY", {
      status: "RUNNING",
      finishedAt: null,
      errorCode: null,
      officeId: 43,
      officeName: "새봄공인중개사",
    }),
    job(104, "NOTICE_PUBLISH", { errorCode: "DELIVERY_FAILED" }),
    job(105, "REFUND_EXECUTE", {
      errorCode: "PG_REJECTED",
      assignedOperatorId: 6,
      assignedOperatorName: "박결제",
    }),
    job(106, "RAW_RETURN_DELIVERY", { errorCode: "STORAGE_UNAVAILABLE" }),
    job(107, "INTEGRATION_CHECK", { errorCode: "CONNECTION_REFUSED" }),
  ];
}

function seedIncidents(): Incident[] {
  const base = {
    affectedOffices: [],
    recoveredAt: null,
    closedAt: null,
    assignedOperatorId: null,
    rootCause: null,
    responseActions: null,
    customerNotice: null,
    preventionTasks: null,
    summary: null,
  };
  return [
    {
      ...base,
      incidentId: 11,
      title: "결제 연동 지연",
      affectedServices: ["BILLING"],
      status: "DETECTED",
      detectedAt: at(-3 * HOUR),
      startedAt: at(-4 * HOUR),
    },
    {
      ...base,
      incidentId: 12,
      title: "알림 발송 실패",
      affectedServices: ["NOTIFICATION", "API"],
      affectedOffices: [42],
      status: "RESPONDING",
      detectedAt: at(-2 * DAY),
      startedAt: at(-2 * DAY),
      assignedOperatorId: 7,
      rootCause: "발송 공급자 장애",
      responseActions: "대체 경로로 전환",
    },
    {
      ...base,
      incidentId: 13,
      title: "검색 지연",
      affectedServices: ["SEARCH"],
      status: "CLOSED",
      detectedAt: at(-9 * DAY),
      startedAt: at(-9 * DAY),
      recoveredAt: at(-8 * DAY),
      closedAt: at(-7 * DAY),
      summary: "색인 재구성으로 복구",
    },
  ];
}

function integration(id: number, patch: Partial<Integration>): Integration {
  return {
    integrationId: id,
    environment: "TEST",
    provider: "TOSS_PAYMENTS",
    functionCode: "PAYMENT",
    enabled: true,
    secretReferenceId: `secret-ref-${id}`,
    maskedConnection: "연결값 ****-4821",
    processingRegion: "KR",
    retentionPolicy: "결제 정보는 법정 보관기간 뒤 파기",
    contractStatus: "SIGNED",
    consentStatus: "NOT_REQUIRED",
    contractNoticeReviewedAt: at(-5 * DAY),
    lastCheckResult: "SUCCESS",
    lastSuccessAt: at(-1 * DAY),
    assignedOperatorId: 5,
    approvedByOperatorId: 2,
    ...patch,
  };
}

function seedIntegrations(): Integration[] {
  return [
    integration(1, {}),
    integration(2, {
      environment: "PRODUCTION",
      enabled: false,
      contractStatus: "PENDING",
      contractNoticeReviewedAt: null,
      lastCheckResult: "NOT_TESTED",
      lastSuccessAt: null,
    }),
    integration(3, {
      environment: "PRODUCTION",
      provider: "SES_MAIL",
      functionCode: "EMAIL",
      processingRegion: "JP",
      consentStatus: "GRANTED",
      maskedConnection: "발신 ****@sairo.example",
    }),
    integration(4, {
      provider: "PASS_IDENTITY",
      functionCode: "IDENTITY",
      lastCheckResult: "FAILED",
      lastSuccessAt: null,
      assignedOperatorId: null,
    }),
    integration(5, {
      environment: "PRODUCTION",
      provider: "PRIVATE_STORAGE",
      functionCode: "STORAGE",
      processingRegion: null,
    }),
  ];
}

function seedRules(): RetentionRule[] {
  const rule = (
    ruleCode: string,
    label: string,
    days: number,
    anchor: string,
    status: RetentionRule["status"],
  ): RetentionRule => ({
    ruleCode,
    dataGroupLabel: label,
    retentionDays: days,
    anchorEvent: anchor,
    basisNote: "내부 권장안",
    status,
    effectiveFrom: "2026-11-09",
    version: 1,
  });
  return [
    rule(
      "GUEST_INPUT_AFTER_APPROVAL_END",
      "비회원 링크 입력 데이터와 승인자 개인정보",
      90,
      "APPROVAL_END",
      "ASSUMPTION",
    ),
    rule("WITHDRAWN_MEMBER_LOG", "탈퇴 회원 접속 기록", 365, "WITHDRAWN_AT", "LAWYER_CONFIRMED"),
    rule("TAX_DOCUMENT", "세금 증빙 발급 기록", 1825, "ISSUED_AT", "ADVISOR_CONFIRMED"),
  ];
}

function seedKakao(): KakaoEvent[] {
  const event = (
    eventId: number,
    direction: KakaoEvent["direction"],
    status: string,
    patch: Partial<KakaoEvent> = {},
  ): KakaoEvent => ({
    eventId,
    direction,
    status,
    attemptCount: 0,
    nextAttemptAt: null,
    lastErrorCode: null,
    referrerType: null,
    userId: 1200 + eventId,
    occurredAt: at(-1 * DAY),
    completedAt: null,
    ...patch,
  });
  return [
    event(91, "OUTBOUND_CALL", "FAILED_RETRYING", {
      attemptCount: 3,
      nextAttemptAt: at(2 * HOUR),
      lastErrorCode: "KAKAO_TIMEOUT",
    }),
    event(92, "OUTBOUND_CALL", "PENDING", { nextAttemptAt: at(60_000) }),
    event(93, "OUTBOUND_CALL", "SUCCEEDED", { attemptCount: 1, completedAt: at(-DAY) }),
    event(94, "INBOUND_WEBHOOK", "APPLIED", {
      referrerType: "UNLINK_FROM_KAKAO",
      completedAt: at(-DAY),
    }),
    event(95, "OUTBOUND_CALL", "ABANDONED", { attemptCount: 5, lastErrorCode: "KAKAO_REJECTED" }),
  ];
}

function seedTerms(): TermsItem[] {
  return [
    {
      termsCode: "TOS",
      version: "2026-09-01",
      status: "ACTIVE",
      effectiveAt: at(-60 * DAY),
      lastCheckedAt: at(-1 * DAY),
      lastResult: "MATCH",
    },
    {
      termsCode: "PRIVACY_POLICY",
      version: "2026-10-01",
      status: "ACTIVE",
      effectiveAt: at(-30 * DAY),
      lastCheckedAt: at(-1 * DAY),
      lastResult: "MISMATCH",
    },
    {
      termsCode: "MARKETING",
      version: "2026-12-01",
      status: "SCHEDULED",
      effectiveAt: at(20 * DAY),
      lastCheckedAt: null,
      lastResult: null,
    },
  ];
}

function authority(
  requestId: number,
  recordedBy: number,
  patch: Partial<AuthorityRequest> = {},
): AuthorityRequest {
  return {
    requestId,
    receivedAt: at(-5 * DAY),
    agencyType: "INVESTIGATION",
    agencyName: "예시 수사기관",
    documentReference: `문서 ${requestId}`,
    legalBasisNote: "검토 대상 법령: 형사 관련 법령",
    targetOfficeId: 12,
    targetUserId: null,
    requestedItems: "대상 사무소의 가입 정보",
    decision: "PENDING",
    providedItems: null,
    providedAt: null,
    officeNoticeStatus: "NOT_REVIEWED",
    recordedByOperatorId: recordedBy,
    approvedByOperatorId: null,
    closedAt: null,
    retentionUntil: null,
    ...patch,
  };
}

function seedAuthority(): AuthorityRequest[] {
  return [
    authority(71, 1),
    authority(72, 3),
    authority(73, 3, {
      decision: "REFUSED",
      officeNoticeStatus: "NOT_ALLOWED",
      closedAt: at(-2 * DAY),
      retentionUntil: "2027-11-09",
    }),
  ];
}

function seedState(): MonitorState {
  return {
    jobs: seedJobs(),
    incidents: seedIncidents(),
    privacyIncidents: [
      {
        privacyIncidentId: 21,
        incidentLogId: 12,
        affectedScope: "가입 사무소 1곳의 고객 연락처",
        reportRequirement: "해당 없음",
        noticeRequirement: "정보주체 통지 필요",
        reportDueAt: null,
        noticeDueAt: at(3 * DAY),
        responseEvidence: null,
        assignedOperatorId: 7,
        createdAt: at(-1 * DAY),
      },
    ],
    integrations: seedIntegrations(),
    failingChecks: new Set([4]),
    companyInfoTested: true,
    copies: [
      {
        copyId: 81,
        integrationId: 1,
        documentKind: "SERVICE_CONTRACT",
        versionLabel: "v1",
        signedOn: "2026-11-20",
        validUntil: null,
        contentSha256: "a".repeat(64),
        subprocessorChangeNotifiedAt: null,
        uploadedByOperatorId: 3,
        uploadedAt: at(-3 * DAY),
        retentionUntil: null,
      },
    ],
    rules: seedRules(),
    kakao: seedKakao(),
    terms: seedTerms(),
    termsOutcome: { PRIVACY_POLICY: "MISMATCH" },
    authority: seedAuthority(),
  };
}

const state: MonitorState = seedState();

export function resetMockOpsSystemMonitor(): void {
  Object.assign(state, seedState());
}

export function setMockCompanyInfoTested(done: boolean): void {
  state.companyInfoTested = done;
}

export function setMockTermsOutcome(termsCode: string, result: TermsResult): void {
  state.termsOutcome[termsCode] = result;
}

const INCIDENT_ORDER: readonly IncidentStatus[] = [
  "DETECTED",
  "CONFIRMED",
  "RESPONDING",
  "RECOVERED",
  "CLOSED",
];
const VALID_OPERATOR_IDS = [1, 2, 3, 4, 5, 6, 7];
const OPS = ["OPS"] as const;
const PRIVACY = ["PRIVACY"] as const;

function operatorError(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !VALID_OPERATOR_IDS.includes(value)) {
    return bad("assignedOperatorId", "활성 운영자가 아닙니다.");
  }
  return null;
}

const jobHandlers: RequestHandler[] = [
  http.get("/api/ops/system-jobs", ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const name = url.searchParams.get("jobName");
    const status = url.searchParams.get("status");
    const officeId = url.searchParams.get("officeId");
    const rows = state.jobs
      .filter((row) => !name || row.jobName.includes(name))
      .filter((row) => !status || row.status === status)
      .filter((row) => !officeId || String(row.officeId) === officeId);
    return HttpResponse.json(pageOf(rows, url));
  }),

  http.post("/api/ops/system-jobs/:jobName/rerun", async ({ request, params }) => {
    const rejected = requireMockOps(["BILLING", "PRIVACY", "MIGRATION", "OPS"]);
    if (rejected) return rejected;
    const jobName = String(params.jobName);
    const body = await readBody(request);
    if (typeof body.runId !== "number") return bad("runId", "재실행할 실행 ID를 입력해 주세요.");
    const original = state.jobs.find((row) => row.runId === body.runId && row.jobName === jobName);
    if (!original) return mockErrors.notFound();
    const needed = jobKindRole(jobName);
    if (needed !== null && !(getMockOperator()?.roles ?? []).includes(needed)) {
      return mockErrors.forbidden();
    }
    if (original.status !== "FAILED") {
      return errorResponse(
        409,
        "INVALID_TRANSITION",
        "이미 성공했거나 진행 중인 실행은 다시 실행할 수 없습니다.",
      );
    }
    const created: JobRun = {
      ...original,
      runId: Math.max(...state.jobs.map((row) => row.runId)) + 1,
      status: "RUNNING",
      scheduledAt: null,
      startedAt: at(0),
      finishedAt: null,
      attemptCount: original.attemptCount + 1,
      errorCode: null,
      nextRunAt: null,
    };
    state.jobs.unshift(created);
    return HttpResponse.json(
      {
        runId: created.runId,
        jobName: created.jobName,
        status: created.status,
        startedAt: created.startedAt,
        attemptCount: created.attemptCount,
        nextRunAt: null,
      },
      { status: 202 },
    );
  }),
];

const incidentHandlers: RequestHandler[] = [
  http.get("/api/ops/incidents", ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    return HttpResponse.json(
      pageOf(
        state.incidents.filter((row) => !status || row.status === status),
        url,
      ),
    );
  }),

  http.post("/api/ops/incidents", async ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const body = await readBody(request);
    const title = text(body.title);
    if (!title || title.length > 200) {
      return bad("title", "장애 제목을 200자 이내로 입력해 주세요.");
    }
    if (!Array.isArray(body.affectedServices) || body.affectedServices.length === 0) {
      return bad("affectedServices", "영향 서비스를 1개 이상 입력해 주세요.");
    }
    if (!isIso(body.startedAt)) return bad("startedAt", "장애 시작 시각을 입력해 주세요.");
    const invalidOperator = operatorError(body.assignedOperatorId);
    if (invalidOperator) return invalidOperator;
    const incident: Incident = {
      incidentId: Math.max(...state.incidents.map((row) => row.incidentId)) + 1,
      title,
      affectedServices: body.affectedServices.filter(
        (item): item is string => typeof item === "string",
      ),
      affectedOffices: Array.isArray(body.affectedOfficeIds)
        ? body.affectedOfficeIds.filter((item): item is number => typeof item === "number")
        : [],
      status: "DETECTED",
      detectedAt: at(0),
      startedAt: body.startedAt,
      recoveredAt: null,
      closedAt: null,
      assignedOperatorId:
        typeof body.assignedOperatorId === "number" ? body.assignedOperatorId : null,
      rootCause: optText(body.rootCause),
      responseActions: null,
      customerNotice: null,
      preventionTasks: null,
      summary: null,
    };
    state.incidents.unshift(incident);
    return HttpResponse.json(
      {
        incidentId: incident.incidentId,
        title: incident.title,
        status: incident.status,
        detectedAt: incident.detectedAt,
        startedAt: incident.startedAt,
        assignedOperatorId: incident.assignedOperatorId,
      },
      { status: 201 },
    );
  }),

  http.patch("/api/ops/incidents/:incidentId", async ({ request, params }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const target = state.incidents.find((row) => row.incidentId === numericId(params.incidentId));
    if (!target) return mockErrors.notFound();
    const body = await readBody(request);
    const next = INCIDENT_ORDER.find((value) => value === body.status);
    if (!next) return bad("status", "장애 상태를 선택해 주세요.");
    const invalidOperator = operatorError(body.assignedOperatorId);
    if (invalidOperator) return invalidOperator;
    const from = INCIDENT_ORDER.indexOf(target.status);
    const to = INCIDENT_ORDER.indexOf(next);
    if (to !== from && to !== from + 1) {
      return errorResponse(
        409,
        "INVALID_TRANSITION",
        "장애 단계는 한 단계씩 순서대로만 바꿀 수 있습니다.",
      );
    }
    if (to !== from) {
      target.status = next;
      if (next === "CLOSED") target.closedAt = at(0);
    }
    if (isIso(body.recoveredAt)) target.recoveredAt = body.recoveredAt;
    if (next === "RECOVERED" && target.recoveredAt === null) target.recoveredAt = at(0);
    for (const key of [
      "rootCause",
      "responseActions",
      "customerNotice",
      "preventionTasks",
      "summary",
    ] as const) {
      const value = body[key];
      if (typeof value === "string") target[key] = value;
    }
    if (typeof body.assignedOperatorId === "number") {
      target.assignedOperatorId = body.assignedOperatorId;
    }
    return HttpResponse.json(target);
  }),

  http.get("/api/ops/privacy-incidents", ({ request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    return HttpResponse.json(pageOf(state.privacyIncidents, new URL(request.url)));
  }),

  http.post("/api/ops/privacy-incidents", async ({ request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const body = await readBody(request);
    const incidentLogId = body.incidentLogId;
    if (typeof incidentLogId !== "number") {
      return bad("incidentLogId", "연결할 장애를 입력해 주세요.");
    }
    const scope = text(body.affectedScope);
    if (!scope) return bad("affectedScope", "필수 입력값입니다.");
    const report = text(body.reportRequirement);
    if (!report) return bad("reportRequirement", "필수 입력값입니다.");
    const notice = text(body.noticeRequirement);
    if (!notice) return bad("noticeRequirement", "필수 입력값입니다.");
    if (!state.incidents.some((row) => row.incidentId === incidentLogId)) {
      return mockErrors.notFound();
    }
    if (state.privacyIncidents.some((row) => row.incidentLogId === incidentLogId)) {
      return bad("incidentLogId", "이미 개인정보 사고가 등록된 장애입니다.");
    }
    const created: PrivacyIncident = {
      privacyIncidentId:
        Math.max(0, ...state.privacyIncidents.map((row) => row.privacyIncidentId)) + 1,
      incidentLogId,
      affectedScope: scope,
      reportRequirement: report,
      noticeRequirement: notice,
      reportDueAt: isIso(body.reportDueAt) ? body.reportDueAt : null,
      noticeDueAt: isIso(body.noticeDueAt) ? body.noticeDueAt : null,
      responseEvidence: null,
      assignedOperatorId: selfId(),
      createdAt: at(0),
    };
    state.privacyIncidents.unshift(created);
    return HttpResponse.json(
      {
        privacyIncidentId: created.privacyIncidentId,
        incidentLogId: created.incidentLogId,
        reportDueAt: created.reportDueAt,
        noticeDueAt: created.noticeDueAt,
        assignedOperatorId: created.assignedOperatorId,
        createdAt: created.createdAt,
      },
      { status: 201 },
    );
  }),

  http.patch("/api/ops/privacy-incidents/:privacyIncidentId", async ({ request, params }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const target = state.privacyIncidents.find(
      (row) => row.privacyIncidentId === numericId(params.privacyIncidentId),
    );
    if (!target) return mockErrors.notFound();
    const body = await readBody(request);
    const evidence = text(body.responseEvidence);
    if (!evidence) return bad("responseEvidence", "증빙 보관 위치를 입력해 주세요.");
    target.responseEvidence = evidence;
    return HttpResponse.json({
      privacyIncidentId: target.privacyIncidentId,
      responseEvidence: evidence,
    });
  }),
];

const CONTRACT_STATUSES = ["PENDING", "SIGNED", "EXPIRED", "TERMINATED"];
const CONSENT_STATUSES = ["NOT_REQUIRED", "PENDING", "GRANTED", "WITHDRAWN"];
const DOCUMENT_KINDS = ["SERVICE_CONTRACT", "PROCESSING_TERMS", "SUBPROCESSOR_NOTICE", "OTHER"];

const integrationHandlers: RequestHandler[] = [
  http.get("/api/ops/integrations", ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    return HttpResponse.json(pageOf(state.integrations, new URL(request.url)));
  }),

  http.post("/api/ops/integrations/:integrationId/check", ({ params }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const target = state.integrations.find(
      (row) => row.integrationId === numericId(params.integrationId),
    );
    if (!target) return mockErrors.notFound();
    const failed = state.failingChecks.has(target.integrationId);
    target.lastCheckResult = failed ? "FAILED" : "SUCCESS";
    if (!failed) target.lastSuccessAt = at(0);
    return HttpResponse.json({
      integrationId: target.integrationId,
      lastCheckResult: target.lastCheckResult,
      lastSuccessAt: target.lastSuccessAt,
    });
  }),

  http.patch("/api/ops/integrations/:integrationId", async ({ request, params }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const target = state.integrations.find(
      (row) => row.integrationId === numericId(params.integrationId),
    );
    if (!target) return mockErrors.notFound();
    const body = await readBody(request);
    if (typeof body.enabled !== "boolean") return bad("enabled", "활성 여부를 선택해 주세요.");
    const contract = String(body.contractStatus ?? target.contractStatus);
    if (!CONTRACT_STATUSES.includes(contract)) {
      return bad("contractStatus", "계약 상태 값이 올바르지 않습니다.");
    }
    const consent = String(body.consentStatus ?? target.consentStatus);
    if (!CONSENT_STATUSES.includes(consent)) {
      return bad("consentStatus", "동의 상태 값이 올바르지 않습니다.");
    }
    const providerChanged = typeof body.provider === "string" && body.provider !== target.provider;
    const regionChanged =
      typeof body.processingRegion === "string" &&
      body.processingRegion !== target.processingRegion;
    const activating = body.enabled && !target.enabled;
    const reviewed =
      body.contractNoticeReviewed === true || target.contractNoticeReviewedAt !== null;
    const ready =
      contract === "SIGNED" &&
      (consent === "NOT_REQUIRED" || consent === "GRANTED") &&
      reviewed &&
      state.companyInfoTested;
    if (target.environment === "PRODUCTION" && (activating || providerChanged || regionChanged)) {
      if (!ready) {
        return errorResponse(
          409,
          "INTEGRATION_PREREQUISITE_INCOMPLETE",
          "계약·동의·고지 점검·승인 또는 회사 정보 게시·수신 시험이 끝나지 않았습니다.",
        );
      }
    }
    target.enabled = body.enabled;
    if (typeof body.provider === "string") target.provider = body.provider;
    if (typeof body.processingRegion === "string") target.processingRegion = body.processingRegion;
    if (typeof body.retentionPolicy === "string") target.retentionPolicy = body.retentionPolicy;
    target.contractStatus = contract as Integration["contractStatus"];
    target.consentStatus = consent as Integration["consentStatus"];
    if (body.contractNoticeReviewed === true) target.contractNoticeReviewedAt = at(0);
    return HttpResponse.json({
      integrationId: target.integrationId,
      environment: target.environment,
      provider: target.provider,
      functionCode: target.functionCode,
      enabled: target.enabled,
      maskedConnection: target.maskedConnection,
      processingRegion: target.processingRegion,
      retentionPolicy: target.retentionPolicy,
      contractStatus: target.contractStatus,
      consentStatus: target.consentStatus,
      contractNoticeReviewedAt: target.contractNoticeReviewedAt,
      lastCheckResult: target.lastCheckResult,
      lastSuccessAt: target.lastSuccessAt,
    });
  }),

  http.get("/api/ops/integrations/:integrationId/contract-copies", ({ params }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const id = numericId(params.integrationId);
    if (!state.integrations.some((row) => row.integrationId === id)) return mockErrors.notFound();
    const items = state.copies
      .filter((row) => row.integrationId === id)
      .map((row) => ({
        copyId: row.copyId,
        documentKind: row.documentKind,
        versionLabel: row.versionLabel,
        signedOn: row.signedOn,
        validUntil: row.validUntil,
        contentSha256: row.contentSha256,
        subprocessorChangeNotifiedAt: row.subprocessorChangeNotifiedAt,
        uploadedAt: row.uploadedAt,
      }));
    return HttpResponse.json({ items });
  }),

  http.post("/api/ops/integrations/:integrationId/contract-copies", async ({ request, params }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const id = numericId(params.integrationId);
    if (!state.integrations.some((row) => row.integrationId === id)) {
      return mockErrors.notFound();
    }
    const body = await readBody(request);
    const kind = text(body.documentKind);
    if (!kind || !DOCUMENT_KINDS.includes(kind)) {
      return bad("documentKind", "문서 종류를 선택해 주세요.");
    }
    const version = text(body.versionLabel);
    if (!version || version.length > 40) {
      return bad("versionLabel", "버전 이름을 40자 이내로 입력해 주세요.");
    }
    const key = text(body.storageKey);
    if (!key || key.length > 300) return bad("storageKey", "저장 키를 300자 이내로 입력해 주세요.");
    const hash = body.contentSha256;
    if (typeof hash !== "string" || !HEX64.test(hash)) {
      return bad("contentSha256", "64자리 16진수 해시를 입력해 주세요.");
    }
    const signedOn = typeof body.signedOn === "string" ? body.signedOn : null;
    const validUntil = typeof body.validUntil === "string" ? body.validUntil : null;
    if (signedOn && validUntil && validUntil < signedOn) {
      return bad("validUntil", "유효 종료일은 체결일 이후여야 합니다.");
    }
    const duplicate = state.copies.some(
      (row) =>
        row.integrationId === id && row.documentKind === kind && row.versionLabel === version,
    );
    if (duplicate) {
      return errorResponse(
        409,
        "DOCUMENT_VERSION_CONFLICT",
        "같은 종류와 버전의 사본이 이미 있습니다.",
      );
    }
    const created: ContractCopy = {
      copyId: Math.max(0, ...state.copies.map((row) => row.copyId)) + 1,
      integrationId: id,
      documentKind: kind,
      versionLabel: version,
      signedOn,
      validUntil,
      contentSha256: hash.toLowerCase(),
      subprocessorChangeNotifiedAt: isIso(body.subprocessorChangeNotifiedAt)
        ? body.subprocessorChangeNotifiedAt
        : null,
      uploadedByOperatorId: selfId(),
      uploadedAt: at(0),
      retentionUntil: null,
    };
    state.copies.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
];

const retentionHandlers: RequestHandler[] = [
  http.get("/api/ops/retention-rules", () => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    return HttpResponse.json({ items: state.rules });
  }),

  http.put("/api/ops/retention-rules/:ruleCode", async ({ request, params }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const target = state.rules.find((row) => row.ruleCode === params.ruleCode);
    if (!target) return mockErrors.notFound();
    const body = await readBody(request);
    const days = body.retentionDays;
    if (typeof days !== "number" || !Number.isInteger(days) || days < 1) {
      return bad("retentionDays", "보관 일수는 1 이상의 정수여야 합니다.");
    }
    const note = text(body.basisNote);
    if (!note) return bad("basisNote", "근거 메모를 입력해 주세요.");
    const status = String(body.status);
    if (!["ASSUMPTION", "LAWYER_CONFIRMED", "ADVISOR_CONFIRMED"].includes(status)) {
      return bad("status", "확인 상태를 선택해 주세요.");
    }
    if (!text(body.changeReason)) return bad("changeReason", "변경 사유를 입력해 주세요.");
    if (request.headers.get("If-Match") !== String(target.version)) {
      return mockErrors.versionConflict(target.version);
    }
    target.retentionDays = days;
    target.basisNote = note;
    target.status = status as RetentionRule["status"];
    target.version += 1;
    target.effectiveFrom = new Date().toISOString().slice(0, 10);
    return HttpResponse.json(target);
  }),

  http.get("/api/ops/kakao-unlink-events", ({ request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const direction = url.searchParams.get("direction");
    const status = url.searchParams.get("status");
    const rows = state.kakao
      .filter((row) => !direction || row.direction === direction)
      .filter((row) => !status || row.status === status);
    return HttpResponse.json(pageOf(rows, url));
  }),

  http.post("/api/ops/kakao-unlink-events/:eventId/retry", ({ params }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const target = state.kakao.find((row) => row.eventId === numericId(params.eventId));
    if (!target) return mockErrors.notFound();
    const retryable =
      target.direction === "OUTBOUND_CALL" &&
      (target.status === "PENDING" || target.status === "FAILED_RETRYING");
    if (!retryable) {
      return errorResponse(
        409,
        "INVALID_TRANSITION",
        "대기·재시도 상태의 호출 작업만 다시 시도할 수 있습니다.",
      );
    }
    target.status = "PENDING";
    target.nextAttemptAt = at(30_000);
    return HttpResponse.json({
      eventId: target.eventId,
      status: "PENDING",
      attemptCount: target.attemptCount,
      nextAttemptAt: target.nextAttemptAt,
    });
  }),
];

const termsHandlers: RequestHandler[] = [
  http.get("/api/ops/terms-hash-checks", () => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    return HttpResponse.json({ items: state.terms });
  }),

  http.post("/api/ops/terms-hash-checks", () => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const checkedAt = at(0);
    const items = state.terms.map((row) => {
      const result = state.termsOutcome[row.termsCode] ?? "MATCH";
      row.lastCheckedAt = checkedAt;
      row.lastResult = result;
      return {
        termsCode: row.termsCode,
        version: row.version,
        result,
        expectedHashPrefix: "ab12cd34",
        actualHashPrefix: result === "ERROR" ? null : result === "MATCH" ? "ab12cd34" : "ff00ee11",
      };
    });
    return HttpResponse.json({
      checkedAt,
      mismatchCount: items.filter((row) => row.result === "MISMATCH").length,
      errorCount: items.filter((row) => row.result === "ERROR").length,
      items,
    });
  }),
];

const authorityHandlers: RequestHandler[] = [
  http.get("/api/ops/authority-requests", ({ request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const decision = url.searchParams.get("decision");
    const open = url.searchParams.get("open") === "true";
    const rows = state.authority
      .filter((row) => !decision || row.decision === decision)
      .filter((row) => !open || row.closedAt === null)
      .map((row) => ({
        requestId: row.requestId,
        receivedAt: row.receivedAt,
        agencyType: row.agencyType,
        agencyName: row.agencyName,
        documentReference: row.documentReference,
        decision: row.decision,
        officeNoticeStatus: row.officeNoticeStatus,
        closedAt: row.closedAt,
      }));
    return HttpResponse.json(pageOf(rows, url));
  }),

  http.post("/api/ops/authority-requests", async ({ request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const body = await readBody(request);
    const receivedAt = body.receivedAt;
    if (!isIso(receivedAt)) return bad("receivedAt", "요청을 받은 시각을 입력해 주세요.");
    if (!["INVESTIGATION", "COURT", "SUPERVISORY", "OTHER"].includes(String(body.agencyType))) {
      return bad("agencyType", "기관 종류를 선택해 주세요.");
    }
    const agencyName = text(body.agencyName);
    if (!agencyName || agencyName.length > 200) {
      return bad("agencyName", "기관 이름을 200자 이내로 입력해 주세요.");
    }
    if (typeof body.documentReference === "string" && body.documentReference.length > 100) {
      return bad("documentReference", "문서 번호는 100자 이내로 입력해 주세요.");
    }
    const basis = text(body.legalBasisNote);
    if (!basis) return bad("legalBasisNote", "법적 근거 메모를 입력해 주세요.");
    const items = text(body.requestedItems);
    if (!items) return bad("requestedItems", "요청 범위를 입력해 주세요.");
    const created = authority(
      Math.max(...state.authority.map((row) => row.requestId)) + 1,
      selfId(),
      {
        receivedAt,
        agencyType: String(body.agencyType),
        agencyName,
        documentReference: text(body.documentReference),
        legalBasisNote: basis,
        targetOfficeId: typeof body.targetOfficeId === "number" ? body.targetOfficeId : null,
        targetUserId: typeof body.targetUserId === "number" ? body.targetUserId : null,
        requestedItems: items,
      },
    );
    state.authority.unshift(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post("/api/ops/authority-requests/:requestId/close", async ({ request, params }) => {
    const rejected = requireMockOps(["PRIVACY", "SECURITY_ADMIN"]);
    if (rejected) return rejected;
    const target = state.authority.find((row) => row.requestId === numericId(params.requestId));
    if (!target) return mockErrors.notFound();
    const body = await readBody(request);
    const decision = String(body.decision);
    if (!["PROVIDED", "PARTIALLY_PROVIDED", "REFUSED", "FORWARDED_TO_OFFICE"].includes(decision)) {
      return bad("decision", "제공 결정을 선택해 주세요.");
    }
    if (!["NOTIFIED", "DEFERRED", "NOT_ALLOWED"].includes(String(body.officeNoticeStatus))) {
      return bad("officeNoticeStatus", "사무소 통지 검토 결과를 선택해 주세요.");
    }
    const provides = decision === "PROVIDED" || decision === "PARTIALLY_PROVIDED";
    const providedItems = text(body.providedItems);
    if (provides) {
      if (!(getMockOperator()?.roles ?? []).includes("SECURITY_ADMIN"))
        return mockErrors.forbidden();
      if (target.recordedByOperatorId === selfId()) {
        return errorResponse(
          403,
          "SELF_APPROVAL_FORBIDDEN",
          "기록한 운영자는 제공 결정을 직접 승인할 수 없습니다.",
        );
      }
      if (!providedItems) return bad("providedItems", "제공한 자료의 범위를 입력해 주세요.");
      if (!isIso(body.providedAt)) return bad("providedAt", "제공 시각을 입력해 주세요.");
    }
    if (target.closedAt !== null) {
      return errorResponse(409, "INVALID_TRANSITION", "이미 종결된 요청입니다.");
    }
    target.decision = decision;
    target.officeNoticeStatus = String(body.officeNoticeStatus);
    target.providedItems = provides ? providedItems : null;
    target.providedAt = provides && isIso(body.providedAt) ? body.providedAt : null;
    target.approvedByOperatorId = provides ? selfId() : null;
    target.closedAt = at(0);
    const until = new Date();
    until.setFullYear(until.getFullYear() + 1);
    target.retentionUntil = until.toISOString().slice(0, 10);
    return HttpResponse.json(target);
  }),
];

export const opsSystemMonitorHandlers: RequestHandler[] = [
  ...jobHandlers,
  ...incidentHandlers,
  ...integrationHandlers,
  ...retentionHandlers,
  ...termsHandlers,
  ...authorityHandlers,
];
