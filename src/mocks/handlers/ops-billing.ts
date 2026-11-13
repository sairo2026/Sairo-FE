import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import type { OpsRefundDetailResponse } from "@/lib/api/contracts/ops.schema";
import { formatSeoulDate } from "@/shared/lib/format";
import { errorResponse, mockErrors } from "../error-responses";
import { findMockPriceSchedule, listMockPriceSchedules } from "./ops-content";
import { getMockOperator, requireMockOps, requireMockStepUp } from "./ops-session";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const NOTICE_DAYS = 30;
const MOCK_BILLING_OPERATOR_IDS = [1, 2, 3];
const OFFICE_NAMES: Record<number, string> = {
  7: "한빛공인중개사사무소",
  8: "새봄공인중개사사무소",
  9: "푸른공인중개사사무소",
  42: "예시공인중개사사무소",
  43: "가온공인중개사사무소",
  44: "나래공인중개사사무소",
  45: "다온공인중개사사무소",
  46: "라온공인중개사사무소",
};

type InvoiceStatus =
  | "UNBILLED"
  | "PROCESSING"
  | "VERIFYING"
  | "PAID"
  | "FAILED"
  | "PARTIALLY_REFUNDED"
  | "FULLY_REFUNDED"
  | "CANCELLED";

type MockAttempt = {
  attemptNo: number;
  pgOrderId: string;
  result: "PROCESSING" | "VERIFYING" | "SUCCESS" | "FAILED";
  attemptedAt: string;
  resolvedAt: string | null;
  failureReason: string | null;
};

type MockInvoice = {
  invoiceId: number;
  officeId: number;
  subscriptionId: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  amount: number;
  memberCountSnapshot: number;
  unitPriceSnapshot: number;
  vatIncludedAmount: number;
  priceVersion: string;
  consentVersion: string;
  consentAmountLimit: number;
  consentedAt: string;
  purchaseConsentId: number;
  status: InvoiceStatus;
  dueAt: string;
  paidAt: string | null;
  createdAt: string;
  chargeAttempts: MockAttempt[];
};

type RefundStatus =
  | "RECEIVED"
  | "REVIEWING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED";

type MockRefund = {
  refundId: number;
  officeId: number;
  invoiceId: number;
  reasonCode: string;
  reasonEventType: OpsRefundDetailResponse["reasonEventType"];
  reasonEventId: string | null;
  requestedAt: string;
  status: RefundStatus;
  entitlementAmount: number | null;
  previousRefundAmount: number;
  reservedAmount: number;
  refundAmount: number | null;
  reviewedByOperatorId: number | null;
  reviewedByOperatorName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  pgRefundId: string | null;
  resolvedAt: string | null;
};

type MockEntry = {
  entryId: number;
  businessDate: string;
  sourceType: "PG_QUERY" | "PG_FILE" | "INTERNAL";
  pgOrderId: string | null;
  invoiceId: number | null;
  refundRequestId: number | null;
  officeId: number | null;
  internalAmount: number | null;
  pgAmount: number | null;
  status: "MATCHED" | "AMOUNT_MISMATCH" | "PG_ONLY" | "INTERNAL_ONLY" | "VERIFYING";
  differenceReason: string | null;
  resolutionEvidence: string | null;
  assignedOperatorId: number | null;
  resolvedAt: string | null;
  createdAt: string;
};

type MockTaxDoc = {
  documentId: number;
  invoiceId: number;
  officeId: number;
  documentKind: string;
  isElectronic: boolean;
  status: string;
  approvalNumber: string | null;
  issuedOn: string | null;
  supplyAmount: number | null;
  vatAmount: number | null;
  dueHint: string | null;
  recipientRegistered: boolean;
  originalDocumentId: number | null;
  operatorNote: string | null;
  recordedAt: string;
  version: number;
};

type MockSchedule = {
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
};

type MockNotice = {
  noticeId: number;
  officeId: number;
  officeName: string;
  subscriptionId: number;
  changeKind: "INCREASE" | "NON_INCREASE";
  fromPriceVersion: string;
  toPriceVersion: string;
  scheduleId: number;
  notifiedAt: string;
  effectiveAt: string;
  responseDueAt: string;
  decision: "PENDING" | "AGREED" | "DECLINED" | "NOT_REQUIRED" | "ENDED_NO_CONSENT";
  decidedAt: string | null;
};

type MockAgreement = {
  agreementId: number;
  officeId: number;
  officeName: string;
  status: "REGISTERED" | "APPROVED" | "REVOKED";
  trialEventId: number;
  priceScheduleId: number;
  priceVersion: string;
  priceStartsAt: string;
  priceEndsAt: string;
  contractedOn: string;
  contractReference: string;
  createdByOperatorId: number;
  approvedByOperatorId: number | null;
  approvedAt: string | null;
  ownerAcknowledgedAt: string | null;
  version: number;
};

type MockEvent = { trialEventId: number; eventName: string; maxOffices: number; isOpen: boolean };

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function yesterdayKst(): string {
  return formatSeoulDate(new Date(Date.now() - DAY));
}

function invoice(id: number, patch: Partial<MockInvoice>): MockInvoice {
  const now = Date.now();
  return {
    invoiceId: id,
    officeId: 42,
    subscriptionId: 9,
    billingPeriodStart: iso(now - 40 * DAY),
    billingPeriodEnd: iso(now - 10 * DAY),
    amount: 33000,
    memberCountSnapshot: 3,
    unitPriceSnapshot: 11000,
    vatIncludedAmount: 33000,
    priceVersion: "2026-09",
    consentVersion: "2026-09",
    consentAmountLimit: 33000,
    consentedAt: iso(now - 41 * DAY),
    purchaseConsentId: 5,
    status: "PAID",
    dueAt: iso(now - 10 * DAY),
    paidAt: iso(now - 9 * DAY),
    createdAt: iso(now - 40 * DAY),
    chargeAttempts: [
      {
        attemptNo: 1,
        pgOrderId: `inv${id}-att1-a8f3`,
        result: "SUCCESS",
        attemptedAt: iso(now - 9 * DAY),
        resolvedAt: iso(now - 9 * DAY),
        failureReason: null,
      },
    ],
    ...patch,
  };
}

function seedInvoices(): MockInvoice[] {
  const now = Date.now();
  return [
    invoice(1, {}),
    invoice(2, {
      officeId: 7,
      status: "VERIFYING",
      paidAt: null,
      chargeAttempts: [
        {
          attemptNo: 1,
          pgOrderId: "inv2-att1-b2c4",
          result: "FAILED",
          attemptedAt: iso(now - 2 * DAY),
          resolvedAt: iso(now - 2 * DAY),
          failureReason: "한도 초과",
        },
        {
          attemptNo: 2,
          pgOrderId: "inv2-att2-c9d1",
          result: "VERIFYING",
          attemptedAt: iso(now - HOUR),
          resolvedAt: null,
          failureReason: null,
        },
      ],
    }),
    invoice(3, { status: "PARTIALLY_REFUNDED" }),
    invoice(4, { officeId: 8, status: "FAILED", paidAt: null, chargeAttempts: [] }),
    invoice(5, { officeId: 9, status: "PAID", amount: 11000, vatIncludedAmount: 11000 }),
  ];
}

function refund(id: number, patch: Partial<MockRefund>): MockRefund {
  return {
    refundId: id,
    officeId: 42,
    invoiceId: 1,
    reasonCode: "DUPLICATE_CHARGE",
    reasonEventType: "INVOICE",
    reasonEventId: "att-77",
    requestedAt: iso(Date.now() - 3 * DAY),
    status: "REVIEWING",
    entitlementAmount: 33000,
    previousRefundAmount: 0,
    reservedAmount: 0,
    refundAmount: 33000,
    reviewedByOperatorId: null,
    reviewedByOperatorName: null,
    reviewedAt: null,
    rejectionReason: null,
    pgRefundId: null,
    resolvedAt: null,
    ...patch,
  };
}

function seedRefunds(): MockRefund[] {
  const reviewed = (operatorId: number, name: string) => ({
    reviewedByOperatorId: operatorId,
    reviewedByOperatorName: name,
    reviewedAt: iso(Date.now() - DAY),
  });
  return [
    refund(1, {
      reasonCode: "CANCELLATION",
      reasonEventType: "SUBSCRIPTION_CANCELLATION",
      reasonEventId: null,
      status: "RECEIVED",
      entitlementAmount: null,
      refundAmount: null,
    }),
    refund(2, {}),
    refund(3, {
      invoiceId: 3,
      reasonCode: "POLICY_COMPENSATION",
      reasonEventType: "POLICY_COMPENSATION",
      reasonEventId: "case-9",
      status: "APPROVED",
      ...reviewed(1, "운영 김사이"),
    }),
    refund(4, {
      officeId: 7,
      invoiceId: 2,
      reasonCode: "POLICY_COMPENSATION",
      reasonEventType: "POLICY_COMPENSATION",
      reasonEventId: "case-10",
      status: "APPROVED",
      ...reviewed(2, "박지원"),
    }),
    refund(5, {
      officeId: 9,
      invoiceId: 5,
      reasonCode: "SERVICE_FAILURE",
      reasonEventType: "SERVICE_INCIDENT",
      reasonEventId: "inc-4",
      status: "APPROVED",
      refundAmount: 11000,
      entitlementAmount: 11000,
      ...reviewed(1, "운영 김사이"),
    }),
    refund(6, {
      status: "COMPLETED",
      pgRefundId: "ab12********",
      resolvedAt: iso(Date.now() - DAY),
      ...reviewed(2, "박지원"),
    }),
    refund(7, { officeId: 9, invoiceId: 5, status: "FAILED", ...reviewed(2, "박지원") }),
    refund(8, { status: "VERIFYING", pgRefundId: "cd34********", ...reviewed(2, "박지원") }),
    refund(9, {
      status: "REJECTED",
      rejectionReason: "환불 대상 기간이 아닙니다.",
      refundAmount: null,
      ...reviewed(2, "박지원"),
    }),
  ];
}

function seedEntries(): MockEntry[] {
  const date = yesterdayKst();
  const base = (id: number, patch: Partial<MockEntry>): MockEntry => ({
    entryId: id,
    businessDate: date,
    sourceType: "PG_QUERY",
    pgOrderId: `inv${id}-att1-a8f3`,
    invoiceId: id,
    refundRequestId: null,
    officeId: 42,
    internalAmount: 33000,
    pgAmount: 33000,
    status: "MATCHED",
    differenceReason: null,
    resolutionEvidence: null,
    assignedOperatorId: null,
    resolvedAt: null,
    createdAt: iso(Date.now() - 5 * HOUR),
    ...patch,
  });
  return [
    base(1, {}),
    base(2, { status: "AMOUNT_MISMATCH", pgAmount: 30000 }),
    base(3, { status: "PG_ONLY", internalAmount: null, invoiceId: null, officeId: null }),
    base(4, { status: "INTERNAL_ONLY", pgAmount: null, pgOrderId: null }),
    base(5, { status: "VERIFYING", sourceType: "PG_FILE" }),
    base(6, {
      status: "AMOUNT_MISMATCH",
      pgAmount: 32000,
      differenceReason: "PG 수수료 차이",
      resolutionEvidence: "정산서 대조 완료",
      assignedOperatorId: 2,
      resolvedAt: iso(Date.now() - HOUR),
    }),
    base(7, { businessDate: "2026-01-01", status: "PG_ONLY", internalAmount: null }),
  ];
}

function taxDoc(id: number, patch: Partial<MockTaxDoc>): MockTaxDoc {
  return {
    documentId: id,
    invoiceId: 1,
    officeId: 42,
    documentKind: "TAX_INVOICE",
    isElectronic: true,
    status: "PENDING",
    approvalNumber: null,
    issuedOn: null,
    supplyAmount: null,
    vatAmount: null,
    dueHint: "2027-08-10",
    recipientRegistered: true,
    originalDocumentId: null,
    operatorNote: null,
    recordedAt: iso(Date.now() - 2 * DAY),
    version: 1,
    ...patch,
  };
}

function seedTaxDocs(): MockTaxDoc[] {
  return [
    taxDoc(61, {}),
    taxDoc(62, {
      invoiceId: 3,
      status: "ISSUED",
      approvalNumber: "20270805-0001",
      issuedOn: "2027-08-05",
      supplyAmount: 30000,
      vatAmount: 3000,
    }),
    taxDoc(63, {
      invoiceId: 5,
      officeId: 9,
      status: "ISSUE_FAILED",
      operatorNote: "수신 정보 오류로 발급하지 못했습니다.",
      recipientRegistered: false,
    }),
    taxDoc(64, { invoiceId: 3, documentKind: "CASH_RECEIPT", status: "NOT_REQUIRED" }),
  ];
}

function seedSchedules(now: number): MockSchedule[] {
  const make = (id: number, patch: Partial<MockSchedule>): MockSchedule => ({
    scheduleId: id,
    version: `2027-0${id - 9}-STD`,
    soloAmount: 11000,
    teamFirstExtra: 5500,
    teamAfterFourExtra: 3300,
    effectiveAt: iso(now + 45 * DAY),
    noticeAt: iso(now),
    status: "SCHEDULED",
    approvedByOperatorId: 2,
    createdAt: iso(now - DAY),
    audience: "STANDARD",
    ...patch,
  });
  return [
    make(10, {}),
    make(11, { effectiveAt: iso(now + NOTICE_DAYS * DAY - 60_000) }),
    make(12, { effectiveAt: iso(now + NOTICE_DAYS * DAY) }),
    make(13, { status: "ACTIVE", effectiveAt: iso(now - 20 * DAY) }),
    make(14, { audience: "START_CUSTOMER", version: "2027-07-START" }),
  ];
}

function seedNotices(now: number): MockNotice[] {
  const make = (id: number, officeId: number, patch: Partial<MockNotice>): MockNotice => ({
    noticeId: id,
    officeId,
    officeName: OFFICE_NAMES[officeId] ?? `사무소 ${officeId}`,
    subscriptionId: 80 + id,
    changeKind: "INCREASE",
    fromPriceVersion: "2026-12-STD",
    toPriceVersion: "2027-01-STD",
    scheduleId: 10,
    notifiedAt: iso(now - 5 * DAY),
    effectiveAt: iso(now + 40 * DAY),
    responseDueAt: iso(now + 39 * DAY),
    decision: "PENDING",
    decidedAt: null,
    ...patch,
  });
  return [
    make(1, 42, {}),
    make(2, 7, { decision: "AGREED", decidedAt: iso(now - 2 * DAY) }),
    make(3, 8, { decision: "DECLINED", decidedAt: iso(now - DAY) }),
    make(4, 9, { changeKind: "NON_INCREASE", decision: "NOT_REQUIRED" }),
    make(5, 43, { decision: "ENDED_NO_CONSENT", decidedAt: iso(now - HOUR) }),
    make(6, 44, {
      fromPriceVersion: "2027-07-START",
      toPriceVersion: "2028-07-STD",
      scheduleId: 12,
    }),
  ];
}

const EVENTS: MockEvent[] = [
  { trialEventId: 7, eventName: "시작 고객 2026-12~2027-01", maxOffices: 15, isOpen: true },
  { trialEventId: 8, eventName: "시작 고객 2027-02", maxOffices: 10, isOpen: true },
  { trialEventId: 9, eventName: "시작 고객 2026-10", maxOffices: 15, isOpen: false },
];

function agreement(id: number, officeId: number, patch: Partial<MockAgreement>): MockAgreement {
  return {
    agreementId: id,
    officeId,
    officeName: OFFICE_NAMES[officeId] ?? `사무소 ${officeId}`,
    status: "REGISTERED",
    trialEventId: 7,
    priceScheduleId: 14,
    priceVersion: "2027-07-START",
    priceStartsAt: "2027-07-01T00:00:00+09:00",
    priceEndsAt: "2028-07-01T00:00:00+09:00",
    contractedOn: "2027-01-15",
    contractReference: `SC-2027-00${id}`,
    createdByOperatorId: 5,
    approvedByOperatorId: null,
    approvedAt: null,
    ownerAcknowledgedAt: null,
    version: 1,
    ...patch,
  };
}

function seedAgreements(): MockAgreement[] {
  return [
    agreement(1, 42, {
      status: "APPROVED",
      approvedByOperatorId: 6,
      approvedAt: "2027-01-16T10:00:00+09:00",
      version: 2,
    }),
    agreement(2, 43, {}),
    agreement(3, 44, { createdByOperatorId: 1 }),
    agreement(4, 45, { trialEventId: 8 }),
    agreement(5, 46, { trialEventId: 9 }),
    agreement(6, 7, { status: "REVOKED", version: 3 }),
  ];
}

type BillingState = {
  now: number;
  invoices: MockInvoice[];
  refunds: MockRefund[];
  entries: MockEntry[];
  taxDocs: MockTaxDoc[];
  schedules: MockSchedule[];
  notices: MockNotice[];
  agreements: MockAgreement[];
  nextId: { taxDoc: number; notice: number; agreement: number };
};

function freshState(): BillingState {
  const now = Date.now();
  return {
    now,
    invoices: seedInvoices(),
    refunds: seedRefunds(),
    entries: seedEntries(),
    taxDocs: seedTaxDocs(),
    schedules: seedSchedules(now),
    notices: seedNotices(now),
    agreements: seedAgreements(),
    nextId: { taxDoc: 70, notice: 20, agreement: 10 },
  };
}

const state = freshState();

function findSchedule(scheduleId: number): MockSchedule | null {
  return (
    state.schedules.find((row) => row.scheduleId === scheduleId) ??
    findMockPriceSchedule(scheduleId)
  );
}

export function resetMockOpsBilling(): void {
  Object.assign(state, freshState());
}

function me(): number {
  return getMockOperator()?.operatorId ?? 0;
}

function meName(): string {
  return getMockOperator()?.name ?? "";
}

function page<T>(rows: T[], url: URL) {
  const pageNo = Number(url.searchParams.get("page") ?? 0);
  const size = Number(url.searchParams.get("size") ?? 25);
  return {
    items: rows.slice(pageNo * size, pageNo * size + size),
    page: pageNo,
    size,
    totalElements: rows.length,
  };
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const body: unknown = await req.json().catch(() => null);
  return typeof body === "object" && body !== null ? Object.fromEntries(Object.entries(body)) : {};
}

function param(url: URL, key: string): string | null {
  const value = url.searchParams.get(key);
  return value === null || value === "" ? null : value;
}

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function invalidTransition() {
  return errorResponse(409, "INVALID_TRANSITION", "현재 상태에서 허용되지 않는 전이입니다.");
}

function invoiceSummary(row: MockInvoice) {
  const { chargeAttempts, ...rest } = row;
  void chargeAttempts;
  return rest;
}

function refundSummary(row: MockRefund) {
  return {
    refundId: row.refundId,
    officeId: row.officeId,
    invoiceId: row.invoiceId,
    reasonCode: row.reasonCode,
    requestedAt: row.requestedAt,
    status: row.status,
    refundAmount: row.refundAmount,
    entitlementAmount: row.entitlementAmount,
    previousRefundAmount: row.previousRefundAmount,
    reservedAmount: row.reservedAmount,
    reviewedAt: row.reviewedAt,
    resolvedAt: row.resolvedAt,
    rejectionReason: row.rejectionReason,
  };
}

function taxSummary(row: MockTaxDoc) {
  return {
    documentId: row.documentId,
    invoiceId: row.invoiceId,
    officeId: row.officeId,
    officeName: OFFICE_NAMES[row.officeId] ?? `사무소 ${row.officeId}`,
    documentKind: row.documentKind,
    isElectronic: row.isElectronic,
    status: row.status,
    approvalNumber: row.approvalNumber,
    issuedOn: row.issuedOn,
    supplyAmount: row.supplyAmount,
    vatAmount: row.vatAmount,
    dueHint: row.dueHint,
    recipientRegistered: row.recipientRegistered,
  };
}

function taxResponse(row: MockTaxDoc) {
  return {
    documentId: row.documentId,
    invoiceId: row.invoiceId,
    documentKind: row.documentKind,
    isElectronic: row.isElectronic,
    status: row.status,
    approvalNumber: row.approvalNumber,
    issuedOn: row.issuedOn,
    supplyAmount: row.supplyAmount,
    vatAmount: row.vatAmount,
    originalDocumentId: row.originalDocumentId,
    operatorNote: row.operatorNote,
    recordedAt: row.recordedAt,
    updatedAt: row.recordedAt,
    version: row.version,
  };
}

const TAX_KINDS = ["TAX_INVOICE", "CASH_RECEIPT", "EXEMPT_INVOICE"];
const TAX_RECORD_STATUSES = ["ISSUED", "ISSUE_FAILED", "NOT_REQUIRED", "PENDING"];
const TAX_ELIGIBLE: InvoiceStatus[] = ["PAID", "PARTIALLY_REFUNDED", "FULLY_REFUNDED"];

type FieldError = { field: string; message: string };

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateTaxRecord(body: Record<string, unknown>): FieldError[] {
  const errors: FieldError[] = [];
  if (!TAX_KINDS.includes(String(body.documentKind)))
    errors.push({ field: "documentKind", message: "증빙 종류를 확인해 주세요." });
  if (typeof body.isElectronic !== "boolean")
    errors.push({ field: "isElectronic", message: "전자 발급 여부를 확인해 주세요." });
  if (!TAX_RECORD_STATUSES.includes(String(body.status)))
    errors.push({ field: "status", message: "기록할 상태를 확인해 주세요." });
  if (body.status === "ISSUED") {
    const approval = textOf(body.approvalNumber);
    if (approval === "" || approval.length > 40)
      errors.push({ field: "approvalNumber", message: "승인번호는 1~40자로 입력해 주세요." });
    if (textOf(body.issuedOn) === "")
      errors.push({ field: "issuedOn", message: "발급일을 입력해 주세요." });
    if (!isInt(body.supplyAmount))
      errors.push({ field: "supplyAmount", message: "공급가액을 입력해 주세요." });
    if (!isInt(body.vatAmount))
      errors.push({ field: "vatAmount", message: "세액을 입력해 주세요." });
  }
  if (body.status === "ISSUE_FAILED" && textOf(body.operatorNote) === "")
    errors.push({ field: "operatorNote", message: "발급 실패 사유를 입력해 주세요." });
  return errors;
}

function nextTaxDocId(): number {
  return state.nextId.taxDoc++;
}

function targetNotices(scheduleId: number, officeIds: number[] | null) {
  const candidates = [7, 8, 9, 42, 43, 44];
  const skipped: { officeId: number; reason: string }[] = [];
  const created: number[] = [];
  for (const officeId of candidates) {
    if (officeIds !== null && !officeIds.includes(officeId)) continue;
    if (officeId === 43) skipped.push({ officeId, reason: "START_CUSTOMER_PRICE_LOCK" });
    else if (officeId === 44) skipped.push({ officeId, reason: "NO_PAYING_SUBSCRIPTION" });
    else if (state.notices.some((n) => n.officeId === officeId && n.scheduleId === scheduleId))
      skipped.push({ officeId, reason: "ALREADY_NOTIFIED" });
    else created.push(officeId);
  }
  return { created, skipped };
}

function cohorts() {
  return EVENTS.map((event) => ({
    trialEventId: event.trialEventId,
    eventName: event.eventName,
    approvedCount: approvedCount(event.trialEventId),
    maxOffices: event.maxOffices,
    targetCount: 10,
  }));
}

function approvedCount(eventId: number): number {
  const base = eventId === 7 ? 7 : eventId === 8 ? 10 : 0;
  return (
    base +
    state.agreements.filter((a) => a.trialEventId === eventId && a.status === "APPROVED").length
  );
}

export const opsBillingHandlers: RequestHandler[] = [
  http.get("/api/ops/billing/invoices", ({ request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const officeId = param(url, "officeId");
    const status = param(url, "status");
    const dueFrom = param(url, "dueFrom");
    const dueTo = param(url, "dueTo");
    const rows = state.invoices
      .filter((row) => (officeId ? String(row.officeId) === officeId : true))
      .filter((row) => (status ? row.status === status : true))
      .filter((row) => (dueFrom ? formatSeoulDate(row.dueAt) >= dueFrom : true))
      .filter((row) => (dueTo ? formatSeoulDate(row.dueAt) <= dueTo : true))
      .map(invoiceSummary);
    return HttpResponse.json(page(rows, url));
  }),

  http.get("/api/ops/billing/invoices/:id", ({ params }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const row = state.invoices.find((item) => String(item.invoiceId) === String(params.id));
    if (!row) return mockErrors.notFound();
    return HttpResponse.json({
      ...row,
      refunds: state.refunds
        .filter((item) => item.invoiceId === row.invoiceId)
        .map((item) => ({
          refundId: item.refundId,
          reasonCode: item.reasonCode,
          status: item.status,
          refundAmount: item.refundAmount,
          requestedAt: item.requestedAt,
          resolvedAt: item.resolvedAt,
        })),
    });
  }),

  http.get("/api/ops/refund-requests", ({ request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const status = param(url, "status");
    const officeId = param(url, "officeId");
    const rows = state.refunds
      .filter((row) => (status ? row.status === status : true))
      .filter((row) => (officeId ? String(row.officeId) === officeId : true))
      .map(refundSummary);
    return HttpResponse.json(page(rows, url));
  }),

  http.get("/api/ops/refund-requests/:id", ({ params }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const row = state.refunds.find((item) => String(item.refundId) === String(params.id));
    if (!row) return mockErrors.notFound();
    return HttpResponse.json(row);
  }),

  http.post("/api/ops/refund-requests/:id/review", async ({ params, request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const row = state.refunds.find((item) => String(item.refundId) === String(params.id));
    if (!row) return mockErrors.notFound();
    const body = await readBody(request);
    const decision = String(body.decision);
    if (decision !== "APPROVE" && decision !== "REJECT")
      return mockErrors.validation([{ field: "decision", message: "검토 결과를 확인해 주세요." }]);
    const eventId = textOf(body.reasonEventId);
    if (decision === "APPROVE" && row.reasonEventId === null && eventId === "")
      return mockErrors.validation([
        { field: "reasonEventId", message: "사건 ID를 입력해 주세요." },
      ]);
    if (row.status !== "RECEIVED" && row.status !== "REVIEWING") return invalidTransition();
    row.reviewedByOperatorId = me();
    row.reviewedByOperatorName = meName();
    row.reviewedAt = new Date().toISOString();
    if (decision === "APPROVE") {
      if (row.reasonEventId === null) row.reasonEventId = eventId;
      row.status = "APPROVED";
      row.entitlementAmount = row.entitlementAmount ?? 10000;
      row.refundAmount = row.refundAmount ?? 10000;
      row.reservedAmount = row.refundAmount;
    } else {
      row.status = "REJECTED";
      row.rejectionReason = textOf(body.note) || null;
      row.refundAmount = null;
    }
    return HttpResponse.json({
      refundId: row.refundId,
      status: row.status,
      reviewedAt: row.reviewedAt,
      rejectionReason: row.rejectionReason,
      refundAmount: row.refundAmount,
      entitlementAmount: row.entitlementAmount,
      previousRefundAmount: row.previousRefundAmount,
      reservedAmount: row.reservedAmount,
    });
  }),

  http.post("/api/ops/refund-requests/:id/execute", ({ params }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    const row = state.refunds.find((item) => String(item.refundId) === String(params.id));
    if (!row) return mockErrors.notFound();
    if (row.reasonCode === "POLICY_COMPENSATION" && row.reviewedByOperatorId === me())
      return errorResponse(
        403,
        "SELF_APPROVAL_FORBIDDEN",
        "검토 승인한 운영자는 실행할 수 없습니다.",
      );
    if (row.status !== "APPROVED") return invalidTransition();
    row.status = "COMPLETED";
    row.pgRefundId = "ef56********";
    row.resolvedAt = new Date().toISOString();
    row.reservedAmount = 0;
    return HttpResponse.json({ refundId: row.refundId, status: "COMPLETED", failureReason: null });
  }),

  http.get("/api/ops/billing/reconciliation", ({ request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const date = param(url, "businessDate") ?? yesterdayKst();
    const status = param(url, "status");
    const assigned = param(url, "assignedOperatorId");
    const unresolved = url.searchParams.get("unresolved") === "true";
    const rows = state.entries
      .filter((row) => row.businessDate === date)
      .filter((row) => (status ? row.status === status : true))
      .filter((row) => (assigned ? String(row.assignedOperatorId) === assigned : true))
      .filter((row) => (unresolved ? row.resolvedAt === null : true));
    return HttpResponse.json(page(rows, url));
  }),

  http.post("/api/ops/billing/reconciliation/:id/resolve", async ({ params, request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const row = state.entries.find((item) => String(item.entryId) === String(params.id));
    if (!row) return mockErrors.notFound();
    const body = await readBody(request);
    const errors: FieldError[] = [];
    if (textOf(body.differenceReason) === "")
      errors.push({ field: "differenceReason", message: "차이 원인을 입력해 주세요." });
    if (textOf(body.resolutionEvidence) === "")
      errors.push({ field: "resolutionEvidence", message: "해결 근거를 입력해 주세요." });
    if (errors.length > 0) return mockErrors.validation(errors);
    if (row.status === "MATCHED" || row.resolvedAt !== null) return invalidTransition();
    const assignee = isInt(body.assigneeOperatorId) ? body.assigneeOperatorId : me();
    if (!MOCK_BILLING_OPERATOR_IDS.includes(assignee))
      return errorResponse(409, "ASSIGNEE_NOT_ELIGIBLE", "담당자로 지정할 수 없는 운영자입니다.");
    row.differenceReason = textOf(body.differenceReason);
    row.resolutionEvidence = textOf(body.resolutionEvidence);
    row.assignedOperatorId = assignee;
    row.resolvedAt = new Date().toISOString();
    row.status = "MATCHED";
    return HttpResponse.json({
      entryId: row.entryId,
      status: row.status,
      differenceReason: row.differenceReason,
      resolutionEvidence: row.resolutionEvidence,
      assignedOperatorId: row.assignedOperatorId,
      resolvedAt: row.resolvedAt,
    });
  }),

  http.get("/api/ops/billing/tax-documents", ({ request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const status = param(url, "status");
    const officeId = param(url, "officeId");
    const dueFrom = param(url, "dueFrom");
    const dueTo = param(url, "dueTo");
    const rows = state.taxDocs
      .filter((row) => (status ? row.status === status : true))
      .filter((row) => (officeId ? String(row.officeId) === officeId : true))
      .filter((row) => (dueFrom ? (row.dueHint ?? "") >= dueFrom : true))
      .filter((row) => (dueTo ? (row.dueHint ?? "9999") <= dueTo : true))
      .map(taxSummary);
    return HttpResponse.json(page(rows, url));
  }),

  http.post("/api/ops/billing/invoices/:id/tax-documents", async ({ params, request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const target = state.invoices.find((item) => String(item.invoiceId) === String(params.id));
    if (!target) return mockErrors.notFound();
    const body = await readBody(request);
    const errors = validateTaxRecord(body);
    if (errors.length > 0) return mockErrors.validation(errors);
    if (!TAX_ELIGIBLE.includes(target.status))
      return errorResponse(409, "TAX_INVOICE_NOT_ELIGIBLE", "증빙을 기록할 수 없는 청구서입니다.");
    const kind = String(body.documentKind);
    if (
      body.status === "ISSUED" &&
      state.taxDocs.some(
        (doc) =>
          doc.invoiceId === target.invoiceId &&
          doc.documentKind === kind &&
          doc.status === "ISSUED",
      )
    )
      return errorResponse(409, "TAX_DOCUMENT_ALREADY_ISSUED", "이미 발급 기록이 있습니다.");
    if (
      body.status === "ISSUED" &&
      Number(body.supplyAmount) + Number(body.vatAmount) !== target.vatIncludedAmount
    )
      return mockErrors.validation([
        { field: "vatAmount", message: "공급가액과 세액의 합이 청구서 총액과 달라요." },
      ]);
    const pending = state.taxDocs.find(
      (doc) =>
        doc.invoiceId === target.invoiceId && doc.documentKind === kind && doc.status === "PENDING",
    );
    const row =
      pending ??
      taxDoc(nextTaxDocId(), {
        invoiceId: target.invoiceId,
        officeId: target.officeId,
        documentKind: kind,
      });
    if (!pending) state.taxDocs.push(row);
    row.isElectronic = body.isElectronic === true;
    row.status = String(body.status);
    row.approvalNumber = textOf(body.approvalNumber) || null;
    row.issuedOn = textOf(body.issuedOn) || null;
    row.supplyAmount = isInt(body.supplyAmount) ? body.supplyAmount : null;
    row.vatAmount = isInt(body.vatAmount) ? body.vatAmount : null;
    row.operatorNote = textOf(body.operatorNote) || null;
    row.recordedAt = new Date().toISOString();
    return HttpResponse.json(taxResponse(row), { status: 201 });
  }),

  http.post("/api/ops/billing/tax-documents/:id/amend", async ({ params, request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const original = state.taxDocs.find((item) => String(item.documentId) === String(params.id));
    if (!original) return mockErrors.notFound();
    const body = await readBody(request);
    const errors: FieldError[] = [];
    const approval = textOf(body.approvalNumber);
    if (approval === "" || approval.length > 40)
      errors.push({ field: "approvalNumber", message: "승인번호는 1~40자로 입력해 주세요." });
    if (textOf(body.issuedOn) === "")
      errors.push({ field: "issuedOn", message: "발급일을 입력해 주세요." });
    if (!isInt(body.supplyAmount))
      errors.push({ field: "supplyAmount", message: "공급가액을 입력해 주세요." });
    if (!isInt(body.vatAmount))
      errors.push({ field: "vatAmount", message: "세액을 입력해 주세요." });
    if (textOf(body.operatorNote) === "")
      errors.push({ field: "operatorNote", message: "수정 사유를 입력해 주세요." });
    if (errors.length > 0) return mockErrors.validation(errors);
    if (original.status !== "ISSUED")
      return errorResponse(
        409,
        "TAX_INVOICE_NOT_ELIGIBLE",
        "발급됨이 아닌 기록은 수정 발급할 수 없습니다.",
      );
    const row = taxDoc(nextTaxDocId(), {
      invoiceId: original.invoiceId,
      officeId: original.officeId,
      documentKind: original.documentKind,
      isElectronic: original.isElectronic,
      status: "AMENDED",
      approvalNumber: approval,
      issuedOn: textOf(body.issuedOn),
      supplyAmount: Number(body.supplyAmount),
      vatAmount: Number(body.vatAmount),
      originalDocumentId: original.documentId,
      operatorNote: textOf(body.operatorNote),
      recordedAt: new Date().toISOString(),
    });
    state.taxDocs.push(row);
    return HttpResponse.json(taxResponse(row), { status: 201 });
  }),

  http.get("/api/ops/price-schedules", ({ request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const rows = [...state.schedules, ...listMockPriceSchedules()];
    return HttpResponse.json(page(rows, new URL(request.url)));
  }),

  http.get("/api/ops/price-change-notices", ({ request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const scheduleId = param(url, "priceScheduleId");
    const decision = param(url, "decision");
    const officeId = param(url, "officeId");
    const scoped = state.notices
      .filter((row) => (scheduleId ? String(row.scheduleId) === scheduleId : true))
      .filter((row) => (officeId ? String(row.officeId) === officeId : true));
    const count = (value: MockNotice["decision"]) =>
      scoped.filter((row) => row.decision === value).length;
    const rows = scoped
      .filter((row) => (decision ? row.decision === decision : true))
      .map((row) => {
        const { scheduleId: ignored, ...rest } = row;
        void ignored;
        return rest;
      });
    return HttpResponse.json({
      ...page(rows, url),
      summary: {
        pending: count("PENDING"),
        agreed: count("AGREED"),
        declined: count("DECLINED"),
        notRequired: count("NOT_REQUIRED"),
        endedNoConsent: count("ENDED_NO_CONSENT"),
      },
    });
  }),

  http.post("/api/ops/price-schedules/:id/notices", async ({ params, request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const schedule = findSchedule(Number(params.id));
    if (!schedule) return mockErrors.notFound();
    const body = await readBody(request);
    const ids = Array.isArray(body.officeIds) ? body.officeIds : null;
    if (ids !== null && (ids.length > 500 || !ids.every(isInt)))
      return mockErrors.validation([{ field: "officeIds", message: "사무소 ID를 확인해 주세요." }]);
    if (schedule.status !== "SCHEDULED" || schedule.audience !== "STANDARD")
      return invalidTransition();
    if (Date.parse(schedule.effectiveAt) < state.now + NOTICE_DAYS * DAY)
      return errorResponse(
        422,
        "PRICE_NOTICE_PERIOD_TOO_SHORT",
        "효력 시각이 안내 시각 30일 뒤보다 앞섭니다.",
      );
    const { created, skipped } = targetNotices(schedule.scheduleId, ids);
    for (const officeId of created) {
      state.notices.push({
        noticeId: state.nextId.notice++,
        officeId,
        officeName: OFFICE_NAMES[officeId] ?? `사무소 ${officeId}`,
        subscriptionId: 80 + officeId,
        changeKind: "INCREASE",
        fromPriceVersion: "2026-12-STD",
        toPriceVersion: schedule.version,
        scheduleId: schedule.scheduleId,
        notifiedAt: new Date().toISOString(),
        effectiveAt: schedule.effectiveAt,
        responseDueAt: schedule.effectiveAt,
        decision: "PENDING",
        decidedAt: null,
      });
    }
    return HttpResponse.json(
      {
        priceScheduleId: schedule.scheduleId,
        createdCount: created.length,
        skippedCount: skipped.length,
        skipped,
      },
      { status: 201 },
    );
  }),

  http.get("/api/ops/start-customer-agreements", ({ request }) => {
    const rejected = requireMockOps(["OPS", "BILLING"]);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const status = param(url, "status");
    const eventId = param(url, "trialEventId");
    const officeId = param(url, "officeId");
    const rows = state.agreements
      .filter((row) => (status ? row.status === status : true))
      .filter((row) => (eventId ? String(row.trialEventId) === eventId : true))
      .filter((row) => (officeId ? String(row.officeId) === officeId : true));
    return HttpResponse.json({ ...page(rows, url), cohorts: cohorts() });
  }),

  http.post("/api/ops/start-customer-agreements", async ({ request }) => {
    const rejected = requireMockOps(["OPS"]);
    if (rejected) return rejected;
    const body = await readBody(request);
    const errors: FieldError[] = [];
    if (!isInt(body.officeId))
      errors.push({ field: "officeId", message: "사무소를 확인해 주세요." });
    const event = EVENTS.find((item) => item.trialEventId === body.trialEventId);
    if (!event)
      errors.push({ field: "trialEventId", message: "시작 고객 이벤트를 확인해 주세요." });
    const schedule =
      typeof body.priceScheduleId === "number" ? findSchedule(body.priceScheduleId) : null;
    if (!schedule || schedule.audience !== "START_CUSTOMER")
      errors.push({ field: "priceScheduleId", message: "시작 고객 가격 버전을 확인해 주세요." });
    const months = body.guaranteeMonths;
    if (months !== undefined && months !== null && (!isInt(months) || months < 1 || months > 24))
      errors.push({ field: "guaranteeMonths", message: "1~24개월로 입력해 주세요." });
    if (textOf(body.contractedOn) === "")
      errors.push({ field: "contractedOn", message: "체결일을 입력해 주세요." });
    const reference = textOf(body.contractReference);
    if (reference === "" || reference.length > 100)
      errors.push({ field: "contractReference", message: "참조번호는 1~100자로 입력해 주세요." });
    if (body.weeklyUseConfirmed !== true)
      errors.push({ field: "weeklyUseConfirmed", message: "주간 사용 확인이 필요합니다." });
    if (body.monthlyInterviewConfirmed !== true)
      errors.push({ field: "monthlyInterviewConfirmed", message: "월 인터뷰 확인이 필요합니다." });
    const textVersion = textOf(body.agreementTextVersion);
    if (textVersion === "" || textVersion.length > 20)
      errors.push({
        field: "agreementTextVersion",
        message: "문안 버전은 1~20자로 입력해 주세요.",
      });
    if (errors.length > 0) return mockErrors.validation(errors);
    const officeId = Number(body.officeId);
    if (!(officeId in OFFICE_NAMES)) return mockErrors.notFound();
    if (
      state.agreements.some(
        (item) =>
          item.officeId === officeId &&
          (item.status === "REGISTERED" || item.status === "APPROVED"),
      )
    )
      return errorResponse(409, "START_CUSTOMER_AGREEMENT_EXISTS", "이미 합의가 있습니다.");
    if (event && !event.isOpen)
      return errorResponse(409, "START_CUSTOMER_WINDOW_CLOSED", "가입 창이 닫혔습니다.");
    const row = agreement(state.nextId.agreement++, officeId, {
      trialEventId: Number(body.trialEventId),
      priceScheduleId: Number(body.priceScheduleId),
      priceVersion: schedule?.version ?? "",
      contractedOn: textOf(body.contractedOn),
      contractReference: reference,
      createdByOperatorId: me(),
    });
    state.agreements.push(row);
    return HttpResponse.json(
      {
        agreementId: row.agreementId,
        officeId: row.officeId,
        status: "REGISTERED",
        trialEventId: row.trialEventId,
        priceScheduleId: row.priceScheduleId,
        priceVersion: row.priceVersion,
        priceStartsAt: row.priceStartsAt,
        priceEndsAt: row.priceEndsAt,
        contractedOn: row.contractedOn,
        createdAt: new Date().toISOString(),
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.post("/api/ops/start-customer-agreements/:id/approve", ({ params, request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const row = state.agreements.find((item) => String(item.agreementId) === String(params.id));
    if (!row) return mockErrors.notFound();
    const version = request.headers.get("If-Match");
    if (version === null)
      return mockErrors.validation([{ field: "If-Match", message: "버전이 필요합니다." }]);
    if (Number(version) !== row.version) return mockErrors.versionConflict(row.version);
    if (row.createdByOperatorId === me())
      return errorResponse(403, "SELF_APPROVAL_FORBIDDEN", "등록한 운영자는 승인할 수 없습니다.");
    if (row.status !== "REGISTERED") return invalidTransition();
    const event = EVENTS.find((item) => item.trialEventId === row.trialEventId);
    if (!event?.isOpen)
      return errorResponse(409, "START_CUSTOMER_WINDOW_CLOSED", "가입 창이 닫혔습니다.");
    if (approvedCount(row.trialEventId) >= event.maxOffices)
      return errorResponse(409, "START_CUSTOMER_QUOTA_EXCEEDED", "승인 상한에 도달했습니다.");
    row.status = "APPROVED";
    row.approvedByOperatorId = me();
    row.approvedAt = new Date().toISOString();
    row.version += 1;
    return HttpResponse.json({
      agreementId: row.agreementId,
      status: "APPROVED",
      approvedAt: row.approvedAt,
      approvedByOperatorId: me(),
      cohort: {
        trialEventId: row.trialEventId,
        approvedCount: approvedCount(row.trialEventId),
        maxOffices: event.maxOffices,
      },
      subscription: {
        subscriptionId: 88,
        status: "TRIAL",
        trialEndsAt: "2027-07-01T00:00:00+09:00",
        firstBillingScheduledAt: "2027-07-01T00:00:00+09:00",
        promoted: true,
      },
      version: row.version,
    });
  }),

  http.post("/api/ops/start-customer-agreements/:id/revoke", async ({ params, request }) => {
    const rejected = requireMockOps(["BILLING"]);
    if (rejected) return rejected;
    const row = state.agreements.find((item) => String(item.agreementId) === String(params.id));
    if (!row) return mockErrors.notFound();
    // 백엔드는 합의 취소에도 If-Match를 요구한다(OpsPricingService.revoke).
    const version = request.headers.get("If-Match");
    if (version === null)
      return mockErrors.validation([{ field: "If-Match", message: "버전이 필요합니다." }]);
    if (Number(version) !== row.version) return mockErrors.versionConflict(row.version);
    const body = await readBody(request);
    if (textOf(body.reason) === "")
      return mockErrors.validation([{ field: "reason", message: "취소 사유를 입력해 주세요." }]);
    if (row.status === "REVOKED") return invalidTransition();
    row.status = "REVOKED";
    row.version += 1;
    return HttpResponse.json({
      agreementId: row.agreementId,
      status: "REVOKED",
      revokedAt: new Date().toISOString(),
      revokedByOperatorId: me(),
      freeEndsAtKept: true,
      priceChangeNoticeId: null,
      version: row.version,
    });
  }),
];
