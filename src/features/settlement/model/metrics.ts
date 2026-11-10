import type { MonthlySettlementResponse } from "@/lib/api/contracts/work.schema";

export type MetricKey = Exclude<
  keyof MonthlySettlementResponse,
  "yearMonth" | "isFinalized" | "asOf"
>;

export type MetricKind = "count" | "money";

export type MetricDef = { key: MetricKey; label: string; kind: MetricKind; unit?: string };

export type MetricGroup = { id: string; title: string; metrics: MetricDef[] };

export const METRIC_GROUPS: MetricGroup[] = [
  {
    id: "holding",
    title: "보유 매물·고객",
    metrics: [
      { key: "propertyCountTotal", label: "월말 보유 매물", kind: "count", unit: "건" },
      { key: "customerCountTotal", label: "월말 보유 고객", kind: "count", unit: "명" },
    ],
  },
  {
    id: "new",
    title: "신규 매물·고객",
    metrics: [
      { key: "propertyCountNew", label: "신규 매물", kind: "count", unit: "건" },
      { key: "customerCountNew", label: "신규 고객", kind: "count", unit: "명" },
    ],
  },
  {
    id: "inquiry",
    title: "최초 문의",
    metrics: [{ key: "firstInquiryCount", label: "최초 문의", kind: "count", unit: "건" }],
  },
  {
    id: "visit",
    title: "방문 완료",
    metrics: [
      { key: "visitCompletedCount", label: "방문 완료 횟수", kind: "count", unit: "회" },
      { key: "visitCompletedPropertyCount", label: "방문 완료 매물", kind: "count", unit: "건" },
    ],
  },
  {
    id: "ended",
    title: "종료 조율",
    metrics: [
      { key: "coordinationEndedCount", label: "종료 조율", kind: "count", unit: "건" },
      {
        key: "coordinationVisitCompletedCount",
        label: "방문 완료로 종료",
        kind: "count",
        unit: "건",
      },
      { key: "coordinationVisitIncompleteCount", label: "미방문 종료", kind: "count", unit: "건" },
    ],
  },
  {
    id: "contract",
    title: "체결 계약",
    metrics: [
      { key: "contractSignedCount", label: "체결 계약", kind: "count", unit: "건" },
      { key: "contractSignedPropertyCount", label: "체결 계약 매물", kind: "count", unit: "건" },
    ],
  },
  {
    id: "maturity",
    title: "임대 만기",
    metrics: [
      { key: "leaseMaturityCount", label: "임대 만기 계약", kind: "count", unit: "건" },
      { key: "leaseMaturityPropertyCount", label: "임대 만기 매물", kind: "count", unit: "건" },
    ],
  },
  {
    id: "agreed",
    title: "잔금 기준 약정보수",
    metrics: [{ key: "agreedFeeTotal", label: "잔금 기준 약정보수", kind: "money" }],
  },
  {
    id: "received",
    title: "실제 중개보수 순수납",
    metrics: [{ key: "actualFeeReceivedTotal", label: "실제 중개보수 순수납", kind: "money" }],
  },
  {
    id: "outstanding",
    title: "미수금",
    metrics: [{ key: "outstandingAmount", label: "미수금", kind: "money" }],
  },
  {
    id: "overcollected",
    title: "초과수납",
    metrics: [{ key: "overcollectedAmount", label: "초과수납", kind: "money" }],
  },
];

export const METRIC_LABEL: Record<string, string> = {
  ...Object.fromEntries(METRIC_GROUPS.flatMap((g) => g.metrics.map((m) => [m.key, m.label]))),
  propertyCountNewMigrated: "데이터 이전으로 등록된 신규 매물",
  customerCountNewMigrated: "데이터 이전으로 등록된 신규 고객",
  agreedFeeUndatedCount: "잔금 예정일이 없어 빠진 계약",
};

export function isMetricName(value: string | null | undefined): value is string {
  return typeof value === "string" && value in METRIC_LABEL;
}

export type DetailColumn = {
  key: string;
  header: string;
  kind?: "date" | "datetime" | "money" | "text" | "bool";
};

const PROPERTY: DetailColumn[] = [
  { key: "propertyName", header: "매물" },
  { key: "address", header: "주소" },
  { key: "effectiveAt", header: "등록 효력 시각", kind: "datetime" },
  { key: "isMigrated", header: "등록 경로", kind: "bool" },
];
const CUSTOMER: DetailColumn[] = [
  { key: "customerName", header: "고객" },
  { key: "effectiveAt", header: "등록 효력 시각", kind: "datetime" },
  { key: "isMigrated", header: "등록 경로", kind: "bool" },
];
const PROPERTY_COUNT: DetailColumn[] = [
  { key: "propertyAddress", header: "매물 주소" },
  { key: "contractCount", header: "계약 수" },
];
const ENDED: DetailColumn[] = [
  { key: "customerName", header: "고객" },
  { key: "endType", header: "종료 구분" },
  { key: "endedAt", header: "종료 시각", kind: "datetime" },
];

export const DETAIL_COLUMNS: Record<string, DetailColumn[]> = {
  propertyCountTotal: PROPERTY,
  propertyCountNew: PROPERTY,
  propertyCountNewMigrated: PROPERTY,
  customerCountTotal: CUSTOMER,
  customerCountNew: CUSTOMER,
  customerCountNewMigrated: CUSTOMER,
  firstInquiryCount: [
    { key: "customerName", header: "고객" },
    { key: "occurredAt", header: "상담 시각", kind: "datetime" },
  ],
  visitCompletedCount: [
    { key: "propertyAddress", header: "매물 주소" },
    { key: "customerName", header: "고객" },
    { key: "actualVisitedAt", header: "방문 시각", kind: "datetime" },
  ],
  visitCompletedPropertyCount: [
    { key: "propertyAddress", header: "매물 주소" },
    { key: "visitCompletedCount", header: "방문 완료 횟수" },
  ],
  coordinationEndedCount: ENDED,
  coordinationVisitCompletedCount: ENDED,
  coordinationVisitIncompleteCount: ENDED,
  contractSignedCount: [
    { key: "propertyAddress", header: "매물 주소" },
    { key: "dealType", header: "거래유형" },
    { key: "signedDate", header: "체결일", kind: "date" },
  ],
  contractSignedPropertyCount: PROPERTY_COUNT,
  leaseMaturityPropertyCount: PROPERTY_COUNT,
  leaseMaturityCount: [
    { key: "propertyAddress", header: "매물 주소" },
    { key: "leaseEndDate", header: "임대 만기일", kind: "date" },
  ],
  agreedFeeTotal: [
    { key: "propertyAddress", header: "매물 주소" },
    { key: "payerName", header: "지급의무자" },
    { key: "balanceDueDate", header: "잔금 예정일", kind: "date" },
    { key: "agreedFeeAmount", header: "약정보수", kind: "money" },
  ],
  agreedFeeUndatedCount: [
    { key: "propertyAddress", header: "매물 주소" },
    { key: "balanceDueDatePendingReason", header: "예정일 미정 사유" },
  ],
  actualFeeReceivedTotal: [
    { key: "propertyAddress", header: "매물 주소" },
    { key: "payerName", header: "지급의무자" },
    { key: "transactionType", header: "구분" },
    { key: "amount", header: "금액", kind: "money" },
    { key: "actualDate", header: "실제 일자", kind: "date" },
  ],
  outstandingAmount: [
    { key: "propertyAddress", header: "매물 주소" },
    { key: "payerName", header: "지급의무자" },
    { key: "billedTotal", header: "청구 합계", kind: "money" },
    { key: "netReceivedTotal", header: "순수납", kind: "money" },
    { key: "balanceAmount", header: "미수 잔액", kind: "money" },
  ],
  overcollectedAmount: [
    { key: "propertyAddress", header: "매물 주소" },
    { key: "payerName", header: "지급의무자" },
    { key: "billedTotal", header: "청구 합계", kind: "money" },
    { key: "netReceivedTotal", header: "순수납", kind: "money" },
    { key: "balanceAmount", header: "초과 금액", kind: "money" },
  ],
};

const END_TYPE: Record<string, string> = {
  VISIT_COMPLETED: "방문 완료",
  VISIT_INCOMPLETE: "미방문 종료",
};
const DEAL_TYPE: Record<string, string> = { SALE: "매매", JEONSE: "전세", MONTHLY: "월세" };
const TRANSACTION_TYPE: Record<string, string> = {
  RECEIPT: "수납",
  REFUND: "환급",
  ADJUSTMENT: "조정",
};

export function detailValueText(column: DetailColumn, raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "-";
  if (column.kind === "bool") return raw === true ? "데이터 이전" : "직접 등록";
  if (column.key === "endType") return END_TYPE[String(raw)] ?? String(raw);
  if (column.key === "dealType") return DEAL_TYPE[String(raw)] ?? String(raw);
  if (column.key === "transactionType") return TRANSACTION_TYPE[String(raw)] ?? String(raw);
  return String(raw);
}

const CONTRACT_METRICS = [
  "contractSignedCount",
  "leaseMaturityCount",
  "agreedFeeTotal",
  "agreedFeeUndatedCount",
  "actualFeeReceivedTotal",
  "outstandingAmount",
  "overcollectedAmount",
];

/** 항목 한 줄에서 알맞은 상세 화면 경로를 고른다. 이동할 곳이 없으면 null이다. */
export function detailRowHref(metric: string, row: Record<string, unknown>): string | null {
  const id = (key: string): number | null => {
    const value = row[key];
    return typeof value === "number" ? value : null;
  };
  if (metric.startsWith("customerCount") || metric === "firstInquiryCount") {
    const customerId = id("customerId");
    return customerId ? `/customers/${customerId}` : null;
  }
  if (metric.startsWith("coordination") || metric === "visitCompletedCount") {
    const coordinationId = id("coordinationId");
    return coordinationId ? `/coordinations/${coordinationId}` : null;
  }
  if (CONTRACT_METRICS.includes(metric)) {
    const contractId = id("contractId");
    return contractId ? `/contracts/${contractId}` : null;
  }
  const propertyId = id("propertyId");
  return propertyId ? `/properties/${propertyId}` : null;
}

export function currentYearMonth(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + 9 * 3_600_000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isYearMonth(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const index = (year ?? 0) * 12 + ((month ?? 1) - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}
