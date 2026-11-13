import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockOperator, requireMockOps } from "./ops-session";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const OPS = ["OPS"] as const;
const BILLING = ["BILLING"] as const;
const OTHER_OPERATOR = 99;

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const dateOnly = (offsetMs: number) => iso(offsetMs).slice(0, 10);

type FieldError = { field: string; message: string };

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

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const trimmed = text(value);
  return trimmed === "" ? null : trimmed;
}

function operatorId(): number {
  return getMockOperator()?.operatorId ?? 1;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function invalid(errors: FieldError[]) {
  return mockErrors.validation(errors);
}

function invalidTransition() {
  return errorResponse(409, "INVALID_TRANSITION", "현재 상태에서 허용되지 않는 전이입니다.");
}

type Status = "DRAFT" | "REVIEW" | "SCHEDULED" | "PUBLISHED" | "ENDED";

type MockAnnouncement = {
  announcementId: number;
  title: string;
  content: string;
  versionNo: number;
  previousVersionId: number | null;
  audienceType: "ALL" | "SUBSCRIPTION_STATUS" | "OFFICE";
  audienceStatus: string | null;
  audienceOfficeId: number | null;
  startsAt: string | null;
  endsAt: string | null;
  importance: "NORMAL" | "IMPORTANT" | "CRITICAL";
  detailUrl: string | null;
  marketing: boolean;
  status: Status;
  scheduledAt: string | null;
  publishedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  reviewedByOperatorId: number | null;
};

type MockPolicy = {
  documentId: number;
  docType: string;
  version: string;
  status: Status;
  body: string;
  changeSummary: string;
  noticeAt: string | null;
  requiresConsent: boolean;
  effectiveAt: string | null;
  publishedAt: string | null;
  reviewedByOperatorId: number | null;
  publishedByOperatorId: number | null;
};

type TrialStatus = "DRAFT" | "REVIEW" | "SCHEDULED" | "ACTIVE" | "ENDED";

type MockTrialEvent = {
  eventId: number;
  name: string;
  startsAt: string;
  endsAt: string;
  officeCreatedDuring: boolean;
  firstApplicationDuring: boolean;
  freeEndMode: "DURATION" | "FIXED_END";
  fixedFreeEndsAt: string | null;
  status: TrialStatus;
  approvedByOperatorId: number | null;
  createdAt: string;
  audience: "GENERAL" | "START_CUSTOMER";
  maxOffices: number | null;
  createdBy: number;
};

type MockPrice = {
  scheduleId: number;
  version: string;
  soloAmount: number;
  teamFirstExtra: number;
  teamAfterFourExtra: number;
  effectiveAt: string;
  noticeAt: string | null;
  status: "DRAFT" | "REVIEW" | "SCHEDULED" | "ACTIVE" | "ENDED";
  approvedByOperatorId: number | null;
  createdAt: string;
  audience: "STANDARD" | "START_CUSTOMER";
  createdBy: number;
};

type MockCompanyInfo = {
  infoId: number;
  versionNo: number;
  businessName: string;
  representativeName: string;
  businessNumber: string;
  address: string;
  contactPhone: string;
  ecommerceNotice: string | null;
  supportEmail: string;
  supportHours: string;
  emergencyContact: string;
  privacyOfficer: string;
  privacyContact: string;
  privacyRequestPath: string;
  cancellationPath: string;
  inquiryDeliveryTestedAt: string | null;
  reviewedByOperatorId: number | null;
  publishedAt: string | null;
};

type MockCalendarDay = { calendarDate: string; isBusinessDay: boolean; reason: string | null };

type MockContentState = {
  announcements: MockAnnouncement[];
  policies: MockPolicy[];
  trials: MockTrialEvent[];
  prices: MockPrice[];
  companyInfos: MockCompanyInfo[];
  calendar: MockCalendarDay[];
  nextAnnouncementId: number;
  nextPolicyId: number;
  nextTrialId: number;
  nextPriceId: number;
  nextInfoId: number;
};

function seedAnnouncements(): MockAnnouncement[] {
  const base = {
    audienceStatus: null,
    audienceOfficeId: null,
    detailUrl: null,
    reviewedByOperatorId: null,
    createdAt: iso(-20 * DAY),
  };
  return [
    {
      ...base,
      announcementId: 1,
      title: "정기 점검 안내",
      content: "이번 주 일요일 새벽에 정기 점검이 있습니다.",
      versionNo: 1,
      previousVersionId: null,
      audienceType: "ALL",
      startsAt: iso(-3 * DAY),
      endsAt: iso(10 * DAY),
      importance: "IMPORTANT",
      marketing: false,
      status: "PUBLISHED",
      scheduledAt: null,
      publishedAt: iso(-3 * DAY),
      endedAt: null,
      reviewedByOperatorId: 7,
    },
    {
      ...base,
      announcementId: 2,
      title: "겨울 이벤트 소개",
      content: "겨울 체험 이벤트를 소개합니다.",
      versionNo: 1,
      previousVersionId: null,
      audienceType: "ALL",
      startsAt: iso(5 * DAY),
      endsAt: iso(30 * DAY),
      importance: "NORMAL",
      marketing: true,
      status: "DRAFT",
      scheduledAt: null,
      publishedAt: null,
      endedAt: null,
    },
    {
      ...base,
      announcementId: 3,
      title: "요금 안내 개편",
      content: "유료 사무소 대상 요금 안내가 바뀝니다.",
      versionNo: 1,
      previousVersionId: null,
      audienceType: "SUBSCRIPTION_STATUS",
      audienceStatus: "ACTIVE",
      startsAt: iso(2 * DAY),
      endsAt: iso(40 * DAY),
      importance: "CRITICAL",
      marketing: false,
      status: "REVIEW",
      scheduledAt: null,
      publishedAt: null,
      endedAt: null,
      reviewedByOperatorId: 1,
    },
    {
      ...base,
      announcementId: 4,
      title: "연말 휴무 안내",
      content: "연말 고객지원 휴무 일정을 안내합니다.",
      versionNo: 1,
      previousVersionId: null,
      audienceType: "ALL",
      startsAt: iso(20 * DAY),
      endsAt: iso(45 * DAY),
      importance: "NORMAL",
      marketing: false,
      status: "SCHEDULED",
      scheduledAt: iso(18 * DAY),
      publishedAt: null,
      endedAt: null,
      reviewedByOperatorId: 7,
    },
    {
      ...base,
      announcementId: 5,
      title: "9월 점검 완료 안내",
      content: "점검이 끝났습니다.",
      versionNo: 1,
      previousVersionId: null,
      audienceType: "ALL",
      startsAt: iso(-60 * DAY),
      endsAt: iso(-50 * DAY),
      importance: "NORMAL",
      marketing: false,
      status: "ENDED",
      scheduledAt: null,
      publishedAt: iso(-60 * DAY),
      endedAt: iso(-50 * DAY),
      reviewedByOperatorId: 7,
    },
    {
      ...base,
      announcementId: 6,
      title: "9월 점검 완료 안내 (수정)",
      content: "점검이 끝났고 일부 기능이 개선되었습니다.",
      versionNo: 2,
      previousVersionId: 5,
      audienceType: "ALL",
      startsAt: iso(-2 * DAY),
      endsAt: iso(20 * DAY),
      importance: "NORMAL",
      marketing: false,
      status: "PUBLISHED",
      scheduledAt: null,
      publishedAt: iso(-2 * DAY),
      endedAt: null,
      reviewedByOperatorId: 7,
    },
  ];
}

function seedPolicies(): MockPolicy[] {
  return [
    {
      documentId: 1,
      docType: "TERMS",
      version: "1.0",
      status: "PUBLISHED",
      body: "제1조 목적\n이 약관은 사이로 서비스 이용 조건을 정합니다.",
      changeSummary: "최초 게시",
      noticeAt: iso(-90 * DAY),
      requiresConsent: true,
      effectiveAt: iso(-60 * DAY),
      publishedAt: iso(-90 * DAY),
      reviewedByOperatorId: 7,
      publishedByOperatorId: 1,
    },
    {
      documentId: 2,
      docType: "TERMS",
      version: "1.1",
      status: "DRAFT",
      body: "제1조 목적\n이 약관은 사이로 서비스 이용 조건을 정합니다. 개정안입니다.",
      changeSummary: "해지 절차 문구 정리",
      noticeAt: iso(20 * DAY),
      requiresConsent: false,
      effectiveAt: iso(40 * DAY),
      publishedAt: null,
      reviewedByOperatorId: null,
      publishedByOperatorId: null,
    },
    {
      documentId: 3,
      docType: "PRIVACY",
      version: "2.0",
      status: "REVIEW",
      body: "개인정보처리방침 2.0 본문입니다.",
      changeSummary: "처리위탁 항목 추가",
      noticeAt: iso(10 * DAY),
      requiresConsent: true,
      effectiveAt: iso(40 * DAY),
      publishedAt: null,
      reviewedByOperatorId: 7,
      publishedByOperatorId: null,
    },
    {
      documentId: 4,
      docType: "REFUND",
      version: "1.0",
      status: "PUBLISHED",
      body: "환불 안내\n해지를 신청하면 다음 결제일부터 결제되지 않습니다.",
      changeSummary: "최초 게시",
      noticeAt: iso(-90 * DAY),
      requiresConsent: false,
      effectiveAt: iso(-60 * DAY),
      publishedAt: iso(-90 * DAY),
      reviewedByOperatorId: 7,
      publishedByOperatorId: 1,
    },
    {
      documentId: 5,
      docType: "PRICING",
      version: "2026-12",
      status: "REVIEW",
      body: "요금표 2026-12 본문입니다.",
      changeSummary: "요금 조정",
      noticeAt: iso(-5 * DAY),
      requiresConsent: true,
      effectiveAt: iso(10 * DAY),
      publishedAt: null,
      reviewedByOperatorId: 7,
      publishedByOperatorId: null,
    },
    {
      documentId: 6,
      docType: "PRICING",
      version: "2027-02",
      status: "REVIEW",
      body: "요금표 2027-02 본문입니다.",
      changeSummary: "요금 조정",
      noticeAt: iso(20 * DAY),
      requiresConsent: false,
      effectiveAt: iso(60 * DAY),
      publishedAt: null,
      reviewedByOperatorId: 7,
      publishedByOperatorId: null,
    },
  ];
}

function seedTrials(): MockTrialEvent[] {
  const base = {
    officeCreatedDuring: true,
    firstApplicationDuring: true,
    freeEndMode: "DURATION" as const,
    fixedFreeEndsAt: null,
    createdAt: iso(-30 * DAY),
    maxOffices: null,
  };
  return [
    {
      ...base,
      eventId: 1,
      name: "가을 체험 이벤트",
      startsAt: iso(-30 * DAY),
      endsAt: iso(100 * DAY),
      status: "ACTIVE",
      approvedByOperatorId: 7,
      audience: "GENERAL",
      createdBy: 7,
    },
    {
      ...base,
      eventId: 2,
      name: "겨울 체험 이벤트",
      startsAt: iso(120 * DAY),
      endsAt: iso(180 * DAY),
      status: "REVIEW",
      approvedByOperatorId: null,
      audience: "GENERAL",
      createdBy: OTHER_OPERATOR,
    },
    {
      ...base,
      eventId: 3,
      name: "시작 고객 모집",
      startsAt: iso(10 * DAY),
      endsAt: iso(70 * DAY),
      status: "REVIEW",
      approvedByOperatorId: null,
      audience: "START_CUSTOMER",
      maxOffices: 30,
      createdBy: 1,
    },
    {
      ...base,
      eventId: 4,
      name: "여름 체험 이벤트",
      startsAt: iso(-200 * DAY),
      endsAt: iso(-120 * DAY),
      status: "ENDED",
      approvedByOperatorId: 7,
      audience: "GENERAL",
      createdBy: 7,
    },
    {
      ...base,
      eventId: 5,
      name: "시작 고객 고정 종료",
      startsAt: iso(30 * DAY),
      endsAt: iso(90 * DAY),
      freeEndMode: "FIXED_END",
      fixedFreeEndsAt: iso(150 * DAY),
      status: "SCHEDULED",
      approvedByOperatorId: 7,
      audience: "START_CUSTOMER",
      maxOffices: 20,
      createdBy: OTHER_OPERATOR,
    },
  ];
}

function seedPrices(): MockPrice[] {
  const base = { noticeAt: iso(-40 * DAY), createdAt: iso(-45 * DAY) };
  return [
    {
      ...base,
      scheduleId: 21,
      version: "2026-09-STD",
      soloAmount: 39_900,
      teamFirstExtra: 10_000,
      teamAfterFourExtra: 8_000,
      effectiveAt: iso(-30 * DAY),
      status: "ACTIVE",
      approvedByOperatorId: 7,
      audience: "STANDARD",
      createdBy: 7,
    },
    {
      ...base,
      scheduleId: 22,
      version: "2027-02-STD",
      soloAmount: 44_900,
      teamFirstExtra: 11_000,
      teamAfterFourExtra: 9_000,
      effectiveAt: iso(60 * DAY),
      status: "DRAFT",
      approvedByOperatorId: null,
      audience: "STANDARD",
      createdBy: OTHER_OPERATOR,
    },
    {
      ...base,
      scheduleId: 23,
      version: "2027-03-STD",
      soloAmount: 47_900,
      teamFirstExtra: 12_000,
      teamAfterFourExtra: 9_500,
      effectiveAt: iso(90 * DAY),
      status: "DRAFT",
      approvedByOperatorId: null,
      audience: "STANDARD",
      createdBy: 1,
    },
    {
      ...base,
      scheduleId: 24,
      version: "2027-02-START",
      soloAmount: 29_900,
      teamFirstExtra: 8_000,
      teamAfterFourExtra: 6_000,
      effectiveAt: iso(60 * DAY),
      status: "SCHEDULED",
      approvedByOperatorId: 7,
      audience: "START_CUSTOMER",
      createdBy: OTHER_OPERATOR,
    },
  ];
}

function seedCompanyInfos(): MockCompanyInfo[] {
  return [
    {
      infoId: 1,
      versionNo: 1,
      businessName: "예시 주식회사",
      representativeName: "홍길동",
      businessNumber: "000-00-00000",
      address: "서울특별시 예시구 예시로 1",
      contactPhone: "02-0000-0000",
      ecommerceNotice: null,
      supportEmail: "support@example.com",
      supportHours: "평일 09:00-18:00",
      emergencyContact: "02-0000-0001",
      privacyOfficer: "예시 책임자",
      privacyContact: "privacy@example.com",
      privacyRequestPath: "설정 > 개인정보 요청",
      cancellationPath: "설정 > 구독 > 해지 예약",
      inquiryDeliveryTestedAt: null,
      reviewedByOperatorId: null,
      publishedAt: iso(-3 * DAY),
    },
  ];
}

function seedCalendar(): MockCalendarDay[] {
  return [
    { calendarDate: dateOnly(3 * DAY), isBusinessDay: true, reason: "임시 영업(토요일)" },
    { calendarDate: dateOnly(30 * DAY), isBusinessDay: false, reason: "연말 휴무" },
    { calendarDate: dateOnly(31 * DAY), isBusinessDay: false, reason: null },
  ];
}

function createState(): MockContentState {
  return {
    announcements: seedAnnouncements(),
    policies: seedPolicies(),
    trials: seedTrials(),
    prices: seedPrices(),
    companyInfos: seedCompanyInfos(),
    calendar: seedCalendar(),
    nextAnnouncementId: 100,
    nextPolicyId: 100,
    nextTrialId: 100,
    nextPriceId: 100,
    nextInfoId: 100,
  };
}

const state: MockContentState = createState();

export function resetMockOpsContent(): void {
  Object.assign(state, createState());
}

function publicAnnouncement(row: MockAnnouncement) {
  const { reviewedByOperatorId, ...rest } = row;
  void reviewedByOperatorId;
  return rest;
}

function parseAnnouncementBody(body: Record<string, unknown>): FieldError[] {
  const errors: FieldError[] = [];
  if (text(body.title) === "") errors.push({ field: "title", message: "제목은 필수입니다." });
  if (text(body.content) === "") errors.push({ field: "content", message: "본문은 필수입니다." });
  const type = body.audienceType;
  if (type !== "ALL" && type !== "SUBSCRIPTION_STATUS" && type !== "OFFICE") {
    errors.push({ field: "audienceType", message: "대상 종류가 올바르지 않습니다." });
  }
  if (type === "SUBSCRIPTION_STATUS" && text(body.audienceStatus) === "") {
    errors.push({ field: "audienceStatus", message: "대상 구독 상태는 필수입니다." });
  }
  if (type === "OFFICE" && typeof body.audienceOfficeId !== "number") {
    errors.push({ field: "audienceOfficeId", message: "대상 사무소는 필수입니다." });
  }
  if (type === "ALL" && (body.audienceStatus || body.audienceOfficeId)) {
    errors.push({ field: "audienceType", message: "전체 대상에는 세부 대상을 받지 않습니다." });
  }
  if (!isIsoDate(body.startsAt))
    errors.push({ field: "startsAt", message: "노출 시작은 필수입니다." });
  if (!isIsoDate(body.endsAt)) errors.push({ field: "endsAt", message: "노출 종료는 필수입니다." });
  if (!["NORMAL", "IMPORTANT", "CRITICAL"].includes(String(body.importance))) {
    errors.push({ field: "importance", message: "중요도가 올바르지 않습니다." });
  }
  if (typeof body.marketing !== "boolean") {
    errors.push({ field: "marketing", message: "마케팅 여부는 필수입니다." });
  }
  return errors;
}

function buildAnnouncement(
  body: Record<string, unknown>,
  extra: Pick<MockAnnouncement, "announcementId" | "versionNo" | "previousVersionId">,
): MockAnnouncement {
  return {
    ...extra,
    title: text(body.title),
    content: typeof body.content === "string" ? body.content : "",
    audienceType: body.audienceType as MockAnnouncement["audienceType"],
    audienceStatus: nullableText(body.audienceStatus),
    audienceOfficeId: typeof body.audienceOfficeId === "number" ? body.audienceOfficeId : null,
    startsAt: String(body.startsAt),
    endsAt: String(body.endsAt),
    importance: body.importance as MockAnnouncement["importance"],
    detailUrl: nullableText(body.detailUrl),
    marketing: body.marketing === true,
    status: "DRAFT",
    scheduledAt: null,
    publishedAt: null,
    endedAt: null,
    createdAt: new Date().toISOString(),
    reviewedByOperatorId: null,
  };
}

function findAnnouncement(id: string | readonly string[] | undefined) {
  return state.announcements.find((row) => String(row.announcementId) === String(id));
}

function findPolicy(id: string | readonly string[] | undefined) {
  return state.policies.find((row) => String(row.documentId) === String(id));
}

function findTrial(id: string | readonly string[] | undefined) {
  return state.trials.find((row) => String(row.eventId) === String(id));
}

function findPrice(id: string | readonly string[] | undefined) {
  return state.prices.find((row) => String(row.scheduleId) === String(id));
}

const POLICY_TYPES = [
  "TERMS",
  "PRIVACY",
  "PROCESSING_OUTSOURCING",
  "ARCHIVE",
  "REFUND",
  "SUBPROCESSORS",
  "PRICING",
];

function publicTrial(row: MockTrialEvent) {
  const { createdBy, ...rest } = row;
  void createdBy;
  return rest;
}

function publicPrice(row: MockPrice) {
  const { createdBy, ...rest } = row;
  void createdBy;
  return rest;
}

function launchState() {
  const latest = [...state.companyInfos].sort((a, b) => b.versionNo - a.versionNo)[0];
  const missingItems: string[] = [];
  if (!latest) missingItems.push("PUBLISHED_VERSION");
  else {
    if (!latest.inquiryDeliveryTestedAt) missingItems.push("INQUIRY_DELIVERY_TEST");
    if (latest.reviewedByOperatorId === null) missingItems.push("REVIEW");
  }
  return { launchReady: missingItems.length === 0, missingItems };
}

const COMPANY_REQUIRED = [
  "businessName",
  "representativeName",
  "businessNumber",
  "address",
  "contactPhone",
  "supportEmail",
  "supportHours",
  "emergencyContact",
  "privacyOfficer",
  "privacyContact",
  "privacyRequestPath",
  "cancellationPath",
] as const;

type PublicPrice = Omit<MockPrice, "createdBy">;

export function listMockPriceSchedules(): PublicPrice[] {
  return state.prices.map(publicPrice);
}

export function findMockPriceSchedule(scheduleId: number): PublicPrice | null {
  const found = state.prices.find((row) => row.scheduleId === scheduleId);
  return found ? publicPrice(found) : null;
}

export const opsPriceScheduleHandlers: RequestHandler[] = [
  http.get("/api/ops/price-schedules", ({ request }) => {
    const rejected = requireMockOps(BILLING);
    if (rejected) return rejected;
    return HttpResponse.json(pageOf(listMockPriceSchedules(), new URL(request.url)));
  }),

  http.post("/api/ops/price-schedules", async ({ request }) => {
    const rejected = requireMockOps(BILLING);
    if (rejected) return rejected;
    const body = await readBody(request);
    const errors: FieldError[] = [];
    for (const key of ["soloAmount", "teamFirstExtra", "teamAfterFourExtra"] as const) {
      if (typeof body[key] !== "number" || body[key] < 0) {
        errors.push({ field: key, message: "금액을 확인해 주세요." });
      }
    }
    if (!isIsoDate(body.effectiveAt))
      errors.push({ field: "effectiveAt", message: "시행 시각은 필수입니다." });
    if (!isIsoDate(body.noticeAt))
      errors.push({ field: "noticeAt", message: "공지 시각은 필수입니다." });
    if (errors.length > 0) return invalid(errors);
    const effectiveAt = Date.parse(String(body.effectiveAt));
    const noticeAt = Date.parse(String(body.noticeAt));
    if (effectiveAt - noticeAt < 30 * DAY) {
      return invalid([
        { field: "noticeAt", message: "공지 시각은 시행 30일 전 이전이어야 합니다." },
      ]);
    }
    const audience = body.audience === "START_CUSTOMER" ? "START_CUSTOMER" : "STANDARD";
    const scheduleId = state.nextPriceId++;
    const row: MockPrice = {
      scheduleId,
      version: `${String(body.effectiveAt).slice(0, 7)}-${audience === "STANDARD" ? "STD" : "START"}-${scheduleId}`,
      soloAmount: Number(body.soloAmount),
      teamFirstExtra: Number(body.teamFirstExtra),
      teamAfterFourExtra: Number(body.teamAfterFourExtra),
      effectiveAt: String(body.effectiveAt),
      noticeAt: String(body.noticeAt),
      status: "DRAFT",
      approvedByOperatorId: null,
      createdAt: new Date().toISOString(),
      audience,
      createdBy: operatorId(),
    };
    state.prices.push(row);
    return HttpResponse.json(
      {
        scheduleId: row.scheduleId,
        version: row.version,
        status: row.status,
        effectiveAt: row.effectiveAt,
        noticeAt: row.noticeAt,
        createdAt: row.createdAt,
        audience: row.audience,
      },
      { status: 201 },
    );
  }),

  http.post("/api/ops/price-schedules/:id/approve", ({ params }) => {
    const rejected = requireMockOps(BILLING);
    if (rejected) return rejected;
    const row = findPrice(params.id);
    if (!row) return mockErrors.notFound();
    if (row.createdBy === operatorId()) {
      return errorResponse(403, "SELF_APPROVAL_FORBIDDEN", "작성자 본인은 승인할 수 없습니다.");
    }
    if (row.status !== "DRAFT" && row.status !== "REVIEW") return invalidTransition();
    row.status = Date.parse(row.effectiveAt) > Date.now() ? "SCHEDULED" : "ACTIVE";
    row.approvedByOperatorId = operatorId();
    return HttpResponse.json({
      scheduleId: row.scheduleId,
      version: row.version,
      status: row.status,
      approvedByOperatorId: row.approvedByOperatorId,
    });
  }),
];

export const opsContentHandlers: RequestHandler[] = [
  http.get("/api/ops/announcements", ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    return HttpResponse.json(
      pageOf(state.announcements.map(publicAnnouncement), new URL(request.url)),
    );
  }),

  http.post("/api/ops/announcements", async ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const body = await readBody(request);
    const errors = parseAnnouncementBody(body);
    if (errors.length > 0) return invalid(errors);
    const row = buildAnnouncement(body, {
      announcementId: state.nextAnnouncementId++,
      versionNo: 1,
      previousVersionId: null,
    });
    state.announcements.unshift(row);
    return HttpResponse.json(
      {
        announcementId: row.announcementId,
        versionNo: row.versionNo,
        status: row.status,
        scheduledAt: null,
        publishedAt: null,
      },
      { status: 201 },
    );
  }),

  http.post("/api/ops/announcements/:id/submit-review", ({ params }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const row = findAnnouncement(params.id);
    if (!row) return mockErrors.notFound();
    if (row.status !== "DRAFT") return invalidTransition();
    row.status = "REVIEW";
    row.reviewedByOperatorId = operatorId();
    return HttpResponse.json({
      announcementId: row.announcementId,
      versionNo: row.versionNo,
      status: row.status,
      reviewedByOperatorId: row.reviewedByOperatorId,
    });
  }),

  http.post("/api/ops/announcements/:id/publish", async ({ params, request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const row = findAnnouncement(params.id);
    if (!row) return mockErrors.notFound();
    const body = await readBody(request);
    if (row.status !== "REVIEW") return invalidTransition();
    const scheduledAt = body.scheduledAt;
    if (scheduledAt !== undefined && scheduledAt !== null) {
      if (!isIsoDate(scheduledAt) || Date.parse(scheduledAt) <= Date.now()) {
        return invalid([{ field: "scheduledAt", message: "예약 시각은 현재 이후여야 합니다." }]);
      }
      row.status = "SCHEDULED";
      row.scheduledAt = scheduledAt;
    } else {
      row.status = "PUBLISHED";
      row.publishedAt = new Date().toISOString();
    }
    return HttpResponse.json({
      announcementId: row.announcementId,
      versionNo: row.versionNo,
      status: row.status,
      scheduledAt: row.scheduledAt,
      publishedAt: row.publishedAt,
    });
  }),

  http.post("/api/ops/announcements/:id/end", ({ params }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const row = findAnnouncement(params.id);
    if (!row) return mockErrors.notFound();
    if (row.status !== "PUBLISHED" && row.status !== "SCHEDULED") return invalidTransition();
    row.status = "ENDED";
    row.endedAt = new Date().toISOString();
    return HttpResponse.json({
      announcementId: row.announcementId,
      versionNo: row.versionNo,
      status: row.status,
      endedAt: row.endedAt,
    });
  }),

  http.post("/api/ops/announcements/:id/revisions", async ({ params, request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const original = findAnnouncement(params.id);
    if (!original) return mockErrors.notFound();
    const body = await readBody(request);
    const errors = parseAnnouncementBody(body);
    if (errors.length > 0) return invalid(errors);
    if (original.status !== "PUBLISHED") return invalidTransition();
    const row = buildAnnouncement(body, {
      announcementId: state.nextAnnouncementId++,
      versionNo: original.versionNo + 1,
      previousVersionId: original.announcementId,
    });
    state.announcements.unshift(row);
    return HttpResponse.json(
      {
        announcementId: row.announcementId,
        versionNo: row.versionNo,
        previousVersionId: original.announcementId,
        status: row.status,
      },
      { status: 201 },
    );
  }),

  http.get("/api/ops/announcements/:id/preview", ({ params }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const row = findAnnouncement(params.id);
    if (!row) return mockErrors.notFound();
    const target =
      row.audienceType === "ALL" ? 120 : row.audienceType === "SUBSCRIPTION_STATUS" ? 40 : 1;
    return HttpResponse.json({
      announcementId: row.announcementId,
      targetOfficeCount: target,
      marketingExcludedCount: row.marketing ? Math.floor(target * 0.15) : 0,
      renderedContent: `${row.title}\n${row.content}`,
    });
  }),

  http.get("/api/ops/policy-documents", ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    return HttpResponse.json(pageOf(state.policies, new URL(request.url)));
  }),

  http.post("/api/ops/policy-documents", async ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const body = await readBody(request);
    const errors: FieldError[] = [];
    if (!POLICY_TYPES.includes(String(body.docType))) {
      errors.push({ field: "docType", message: "문서 종류가 올바르지 않습니다." });
    }
    if (text(body.version) === "") errors.push({ field: "version", message: "버전은 필수입니다." });
    if (text(body.body) === "") errors.push({ field: "body", message: "본문은 필수입니다." });
    if (text(body.changeSummary) === "") {
      errors.push({ field: "changeSummary", message: "변경 요약은 필수입니다." });
    }
    if (!isIsoDate(body.noticeAt))
      errors.push({ field: "noticeAt", message: "공지일은 필수입니다." });
    if (!isIsoDate(body.effectiveAt))
      errors.push({ field: "effectiveAt", message: "시행일은 필수입니다." });
    if (typeof body.requiresConsent !== "boolean") {
      errors.push({ field: "requiresConsent", message: "필요 동의 여부는 필수입니다." });
    }
    if (errors.length > 0) return invalid(errors);
    const duplicate = state.policies.find(
      (row) => row.docType === body.docType && row.version === text(body.version),
    );
    if (duplicate) {
      return errorResponse(
        409,
        "POLICY_VERSION_EXISTS",
        "같은 종류와 버전의 문서가 이미 있습니다. 게시본은 덮어쓰지 않으니 새 버전으로 등록해 주세요.",
      );
    }
    const row: MockPolicy = {
      documentId: state.nextPolicyId++,
      docType: String(body.docType),
      version: text(body.version),
      status: "DRAFT",
      body: String(body.body),
      changeSummary: text(body.changeSummary),
      noticeAt: String(body.noticeAt),
      requiresConsent: body.requiresConsent === true,
      effectiveAt: String(body.effectiveAt),
      publishedAt: null,
      reviewedByOperatorId: null,
      publishedByOperatorId: null,
    };
    state.policies.unshift(row);
    return HttpResponse.json(
      {
        documentId: row.documentId,
        docType: row.docType,
        version: row.version,
        status: row.status,
        effectiveAt: row.effectiveAt,
      },
      { status: 201 },
    );
  }),

  http.post("/api/ops/policy-documents/:id/submit-review", ({ params }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const row = findPolicy(params.id);
    if (!row) return mockErrors.notFound();
    if (row.status !== "DRAFT") return invalidTransition();
    row.status = "REVIEW";
    row.reviewedByOperatorId = operatorId();
    return HttpResponse.json({
      documentId: row.documentId,
      version: row.version,
      status: row.status,
      reviewedByOperatorId: row.reviewedByOperatorId,
    });
  }),

  http.post("/api/ops/policy-documents/:id/publish", ({ params }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const row = findPolicy(params.id);
    if (!row) return mockErrors.notFound();
    if (row.status !== "REVIEW") return invalidTransition();
    const effective = row.effectiveAt ? Date.parse(row.effectiveAt) : Date.now();
    if (row.docType === "PRICING" && effective - Date.now() < 30 * DAY) {
      return mockErrors.validation([
        { field: "effectiveAt", message: "요금 변경은 시행 30일 전까지만 게시할 수 있습니다." },
      ]);
    }
    row.status = effective > Date.now() ? "SCHEDULED" : "PUBLISHED";
    row.publishedAt = new Date().toISOString();
    row.publishedByOperatorId = operatorId();
    return HttpResponse.json({
      documentId: row.documentId,
      version: row.version,
      status: row.status,
      publishedAt: row.publishedAt,
    });
  }),

  http.get("/api/ops/trial-events", ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    return HttpResponse.json(pageOf(state.trials.map(publicTrial), new URL(request.url)));
  }),

  http.post("/api/ops/trial-events", async ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const body = await readBody(request);
    const errors: FieldError[] = [];
    if (text(body.name) === "" || text(body.name).length > 100) {
      errors.push({ field: "name", message: "이벤트명은 1자 이상 100자 이내여야 합니다." });
    }
    if (!isIsoDate(body.startsAt))
      errors.push({ field: "startsAt", message: "시작 시각은 필수입니다." });
    if (!isIsoDate(body.endsAt))
      errors.push({ field: "endsAt", message: "종료 시각은 필수입니다." });
    if (
      isIsoDate(body.startsAt) &&
      isIsoDate(body.endsAt) &&
      Date.parse(body.endsAt) <= Date.parse(body.startsAt)
    ) {
      errors.push({ field: "endsAt", message: "종료 시각은 시작 시각보다 뒤여야 합니다." });
    }
    const mode = body.freeEndMode === undefined ? "DURATION" : body.freeEndMode;
    if (mode !== "DURATION" && mode !== "FIXED_END") {
      errors.push({ field: "freeEndMode", message: "무료 종료 방식이 올바르지 않습니다." });
    }
    const fixed = body.fixedFreeEndsAt ?? null;
    if (mode === "FIXED_END" && !isIsoDate(fixed)) {
      errors.push({ field: "fixedFreeEndsAt", message: "고정 무료 종료 시각은 필수입니다." });
    }
    if (mode === "DURATION" && fixed !== null) {
      errors.push({
        field: "fixedFreeEndsAt",
        message: "기간 방식에는 고정 종료 시각을 받지 않습니다.",
      });
    }
    const audience = body.audience === undefined ? "GENERAL" : body.audience;
    if (audience !== "GENERAL" && audience !== "START_CUSTOMER") {
      errors.push({ field: "audience", message: "이벤트 대상이 올바르지 않습니다." });
    }
    const maxOffices = body.maxOffices ?? null;
    if (audience === "START_CUSTOMER" && (typeof maxOffices !== "number" || maxOffices < 1)) {
      errors.push({ field: "maxOffices", message: "승인 사무소 상한은 1 이상이어야 합니다." });
    }
    if (audience === "GENERAL" && maxOffices !== null) {
      errors.push({ field: "maxOffices", message: "일반 이벤트에는 상한을 받지 않습니다." });
    }
    if (errors.length > 0) return invalid(errors);
    const startsAt = Date.parse(String(body.startsAt));
    const endsAt = Date.parse(String(body.endsAt));
    if (audience === "GENERAL") {
      const overlap = state.trials.some(
        (row) =>
          row.audience === "GENERAL" &&
          (row.status === "ACTIVE" || row.status === "SCHEDULED") &&
          Date.parse(row.startsAt) < endsAt &&
          startsAt < Date.parse(row.endsAt),
      );
      if (overlap) {
        return errorResponse(
          409,
          "TRIAL_EVENT_WINDOW_OVERLAP",
          "같은 대상의 활성·예약 이벤트와 가입 창이 겹칩니다.",
        );
      }
    }
    const row: MockTrialEvent = {
      eventId: state.nextTrialId++,
      name: text(body.name),
      startsAt: String(body.startsAt),
      endsAt: String(body.endsAt),
      officeCreatedDuring: body.officeCreatedDuring !== false,
      firstApplicationDuring: body.firstApplicationDuring !== false,
      freeEndMode: mode === "FIXED_END" ? "FIXED_END" : "DURATION",
      fixedFreeEndsAt: mode === "FIXED_END" ? String(fixed) : null,
      status: "REVIEW",
      approvedByOperatorId: null,
      createdAt: new Date().toISOString(),
      audience: audience === "START_CUSTOMER" ? "START_CUSTOMER" : "GENERAL",
      maxOffices: typeof maxOffices === "number" ? maxOffices : null,
      createdBy: operatorId(),
    };
    state.trials.push(row);
    return HttpResponse.json(
      {
        eventId: row.eventId,
        name: row.name,
        status: row.status,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        freeEndMode: row.freeEndMode,
        fixedFreeEndsAt: row.fixedFreeEndsAt,
        createdAt: row.createdAt,
        audience: row.audience,
        maxOffices: row.maxOffices,
      },
      { status: 201 },
    );
  }),

  http.get("/api/ops/trial-events/:id/preview", ({ params }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const row = findTrial(params.id);
    if (!row) return mockErrors.notFound();
    const duplicates =
      row.eventId === 2
        ? [
            { officeId: 42, officeName: "예시공인중개사사무소" },
            { officeId: 43, officeName: "가온공인중개사사무소" },
          ]
        : [];
    return HttpResponse.json({
      eventId: row.eventId,
      targetOfficeCount: row.audience === "START_CUSTOMER" ? 12 : 85,
      duplicateBenefitCount: duplicates.length,
      duplicateOffices: duplicates,
    });
  }),

  http.post("/api/ops/trial-events/:id/approve", ({ params }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const row = findTrial(params.id);
    if (!row) return mockErrors.notFound();
    if (row.createdBy === operatorId()) {
      return errorResponse(403, "SELF_APPROVAL_FORBIDDEN", "작성자 본인은 승인할 수 없습니다.");
    }
    if (row.status !== "REVIEW") return invalidTransition();
    row.status = Date.parse(row.startsAt) > Date.now() ? "SCHEDULED" : "ACTIVE";
    row.approvedByOperatorId = operatorId();
    return HttpResponse.json({
      eventId: row.eventId,
      status: row.status,
      approvedByOperatorId: row.approvedByOperatorId,
    });
  }),

  http.post("/api/ops/trial-events/:id/stop", ({ params }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const row = findTrial(params.id);
    if (!row) return mockErrors.notFound();
    if (row.status !== "SCHEDULED" && row.status !== "ACTIVE") return invalidTransition();
    row.status = "ENDED";
    if (Date.parse(row.endsAt) > Date.now()) row.endsAt = new Date().toISOString();
    return HttpResponse.json({ eventId: row.eventId, status: row.status, endsAt: row.endsAt });
  }),

  ...opsPriceScheduleHandlers,

  http.get("/api/ops/company-service-info", ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const sorted = [...state.companyInfos].sort((a, b) => b.versionNo - a.versionNo);
    return HttpResponse.json({ ...pageOf(sorted, new URL(request.url)), ...launchState() });
  }),

  http.post("/api/ops/company-service-info", async ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const body = await readBody(request);
    const errors: FieldError[] = [];
    for (const key of COMPANY_REQUIRED) {
      if (text(body[key]) === "") errors.push({ field: key, message: "필수 입력 항목입니다." });
    }
    if (errors.length > 0) return invalid(errors);
    const row: MockCompanyInfo = {
      infoId: state.nextInfoId++,
      versionNo: Math.max(0, ...state.companyInfos.map((item) => item.versionNo)) + 1,
      businessName: text(body.businessName),
      representativeName: text(body.representativeName),
      businessNumber: text(body.businessNumber),
      address: text(body.address),
      contactPhone: text(body.contactPhone),
      ecommerceNotice: nullableText(body.ecommerceNotice),
      supportEmail: text(body.supportEmail),
      supportHours: text(body.supportHours),
      emergencyContact: text(body.emergencyContact),
      privacyOfficer: text(body.privacyOfficer),
      privacyContact: text(body.privacyContact),
      privacyRequestPath: text(body.privacyRequestPath),
      cancellationPath: text(body.cancellationPath),
      inquiryDeliveryTestedAt: null,
      reviewedByOperatorId: null,
      // 백엔드처럼 등록 때는 게시하지 않고 수신 시험 성공을 기록할 때 게시한다.
      publishedAt: null,
    };
    state.companyInfos.push(row);
    return HttpResponse.json(
      {
        infoId: row.infoId,
        versionNo: row.versionNo,
        inquiryDeliveryTestedAt: null,
        reviewedByOperatorId: null,
        publishedAt: row.publishedAt,
      },
      { status: 201 },
    );
  }),

  http.post("/api/ops/company-service-info/:id/inquiry-test", async ({ params, request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const row = state.companyInfos.find((item) => String(item.infoId) === String(params.id));
    if (!row) return mockErrors.notFound();
    const body = await readBody(request);
    if (body.result !== "SUCCESS" && body.result !== "FAILED") {
      return invalid([{ field: "result", message: "SUCCESS 또는 FAILED만 받습니다." }]);
    }
    // 실패는 기록을 바꾸지 않는다(백엔드 OpsContentController 설명).
    if (body.result === "SUCCESS") {
      const now = new Date().toISOString();
      row.inquiryDeliveryTestedAt = now;
      row.reviewedByOperatorId = operatorId();
      row.publishedAt = now;
    }
    return HttpResponse.json({
      infoId: row.infoId,
      inquiryDeliveryTestedAt: row.inquiryDeliveryTestedAt,
      reviewedByOperatorId: row.reviewedByOperatorId,
      publishedAt: row.publishedAt,
    });
  }),

  http.get("/api/ops/business-calendar", ({ request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const sorted = [...state.calendar].sort((a, b) => a.calendarDate.localeCompare(b.calendarDate));
    return HttpResponse.json(pageOf(sorted, new URL(request.url)));
  }),

  http.put("/api/ops/business-calendar/:date", async ({ params, request }) => {
    const rejected = requireMockOps(OPS);
    if (rejected) return rejected;
    const date = String(params.date);
    const body = await readBody(request);
    const errors: FieldError[] = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      errors.push({ field: "date", message: "날짜 형식이 올바르지 않습니다." });
    }
    if (typeof body.isBusinessDay !== "boolean") {
      errors.push({ field: "isBusinessDay", message: "영업일 여부는 필수입니다." });
    }
    const reason = body.reason ?? null;
    if (reason !== null && (typeof reason !== "string" || reason.length > 200)) {
      errors.push({ field: "reason", message: "사유는 200자 이내여야 합니다." });
    }
    if (errors.length > 0) return invalid(errors);
    const next: MockCalendarDay = {
      calendarDate: date,
      isBusinessDay: body.isBusinessDay === true,
      reason: typeof reason === "string" && reason !== "" ? reason : null,
    };
    const index = state.calendar.findIndex((day) => day.calendarDate === date);
    if (index >= 0) state.calendar[index] = next;
    else state.calendar.push(next);
    return HttpResponse.json(next);
  }),
];
