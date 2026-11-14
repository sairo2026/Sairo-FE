import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import {
  TARGET_FIELDS,
  isMappingTargetType,
} from "@/features/ops/import-support/import-support-model";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockOperator, requireMockOps } from "./ops-session";

type MockMapping = {
  versionNo: number;
  sourceSystem: string;
  targetType: string;
  confirmedByType: "MEMBERSHIP" | "OPERATOR";
  confirmedByName: string;
  createdAt: string;
  items: { sourceColumn: string; targetField: string; confidence: number | null }[];
};

type MockSupport = {
  requestId: number;
  officeId: number;
  officeName: string;
  importBatchId: number;
  batchStatus: string;
  rowCount: number | null;
  sourceSystem: string;
  estimatedRowCount: number;
  quoteAmount: number | null;
  scopeNote: string | null;
  status: string;
  assignedOperatorId: number | null;
  assignedOperatorName: string | null;
  processingStartedAt: string | null;
  submittedAt: string | null;
  changeRequestCount: number;
  changeRequestReason: string | null;
  changeRequestedAt: string | null;
  approvedAt: string | null;
  approvedMappingVersionNo: number | null;
  executedAt: string | null;
  deliveredAt: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  sourceColumns: string[];
  mappings: MockMapping[];
  requestedAt: string;
  updatedAt: string;
  version: number;
};

const COLUMNS = ["고객번호", "성명", "연락처", "메모"];
const SELF = 1;

function iso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
}

function mapping(versionNo: number, by: "MEMBERSHIP" | "OPERATOR"): MockMapping {
  return {
    versionNo,
    sourceSystem: "양셀-2026",
    targetType: "CUSTOMER",
    confirmedByType: by,
    confirmedByName: by === "OPERATOR" ? "운영 김사이" : "김대표",
    createdAt: iso(10),
    items: [
      { sourceColumn: "고객번호", targetField: "customerSourceId", confidence: 0.98 },
      { sourceColumn: "성명", targetField: "customerName", confidence: 0.93 },
      { sourceColumn: "연락처", targetField: "customerPhone", confidence: 0.9 },
    ],
  };
}

function base(requestId: number, status: string, patch: Partial<MockSupport> = {}): MockSupport {
  return {
    requestId,
    officeId: 42,
    officeName: "한빛공인중개사",
    importBatchId: 30 + requestId - 400,
    batchStatus: "PREVIEW",
    rowCount: 3000,
    sourceSystem: "양셀-2026",
    estimatedRowCount: 3000,
    quoteAmount: null,
    scopeNote: null,
    status,
    assignedOperatorId: null,
    assignedOperatorName: null,
    processingStartedAt: null,
    submittedAt: null,
    changeRequestCount: 0,
    changeRequestReason: null,
    changeRequestedAt: null,
    approvedAt: null,
    approvedMappingVersionNo: null,
    executedAt: null,
    deliveredAt: null,
    rejectedAt: null,
    rejectReason: null,
    sourceColumns: COLUMNS,
    mappings: [],
    requestedAt: iso(48 + (500 - requestId)),
    updatedAt: iso(1),
    version: 3,
    ...patch,
  };
}

function seed(): MockSupport[] {
  const mine = { assignedOperatorId: SELF, assignedOperatorName: "운영 김사이" };
  const quoted = { quoteAmount: 220_000, scopeNote: "원본 1종, 최대 5만 레코드" };
  return [
    // 백엔드처럼 매핑 확정 전 요청은 업로드 행 수가 비어 있다.
    base(401, "REQUESTED", { rowCount: null }),
    base(402, "QUOTED", quoted),
    base(403, "ACCEPTED", quoted),
    base(404, "PAID", quoted),
    base(405, "PROCESSING", {
      ...mine,
      ...quoted,
      processingStartedAt: iso(5),
      mappings: [mapping(1, "OPERATOR")],
    }),
    base(406, "PROCESSING", {
      ...mine,
      ...quoted,
      processingStartedAt: iso(30),
      submittedAt: iso(20),
      changeRequestCount: 1,
      changeRequestReason: "연락처 열을 보조 연락처로 바꿔 주세요.",
      changeRequestedAt: iso(12),
      mappings: [mapping(1, "OPERATOR")],
    }),
    base(407, "REVIEW", {
      ...mine,
      ...quoted,
      processingStartedAt: iso(30),
      submittedAt: iso(2),
      mappings: [mapping(1, "OPERATOR")],
    }),
    base(408, "APPROVED", {
      ...mine,
      ...quoted,
      approvedAt: iso(1),
      approvedMappingVersionNo: 1,
      mappings: [mapping(1, "OPERATOR")],
    }),
    base(409, "APPROVED", {
      ...mine,
      ...quoted,
      batchStatus: "COMPLETED",
      approvedAt: iso(5),
      approvedMappingVersionNo: 1,
      executedAt: iso(2),
      mappings: [mapping(1, "OPERATOR")],
    }),
    base(410, "DELIVERED", {
      ...mine,
      ...quoted,
      batchStatus: "COMPLETED",
      approvedAt: iso(50),
      approvedMappingVersionNo: 1,
      executedAt: iso(40),
      deliveredAt: iso(30),
      mappings: [mapping(1, "OPERATOR")],
    }),
    base(411, "REJECTED", {
      rejectedAt: iso(20),
      rejectReason: "표준 범위를 넘는 이전 요청입니다.",
    }),
    base(412, "PROCESSING", {
      assignedOperatorId: 9,
      assignedOperatorName: "이전담당",
      ...quoted,
      processingStartedAt: iso(8),
      mappings: [mapping(1, "OPERATOR")],
    }),
  ];
}

const state = { rows: seed(), executePolls: new Map<number, number>() };

export function resetMockImportSupport(): void {
  state.rows = seed();
  state.executePolls = new Map();
}

export function finishMockImportExecution(requestId: number, batchStatus = "COMPLETED"): void {
  const row = state.rows.find((candidate) => candidate.requestId === requestId);
  if (row) row.batchStatus = batchStatus;
}

const MIGRATION = ["MIGRATION"] as const;

function find(id: string): MockSupport | undefined {
  return state.rows.find((row) => String(row.requestId) === id);
}

function isAssignee(row: MockSupport): boolean {
  return row.assignedOperatorId === (getMockOperator()?.operatorId ?? SELF);
}

function allowedActions(row: MockSupport): string[] {
  if (row.status === "REQUESTED" || row.status === "QUOTED") return ["QUOTE", "REJECT"];
  if (row.status === "PAID") return ["START"];
  if (!isAssignee(row)) return [];
  if (row.status === "PROCESSING") return ["EDIT_MAPPING", "SUBMIT_REVIEW"];
  if (row.status === "APPROVED" && row.batchStatus === "PREVIEW") return ["EXECUTE"];
  if (row.status === "APPROVED" && row.batchStatus === "COMPLETED") return ["DELIVER"];
  return [];
}

function previewSummary(row: MockSupport) {
  if (row.mappings.length === 0) return null;
  return {
    rowCount: row.rowCount ?? 0,
    warningCount: 12,
    duplicateCount: 4,
    relationMatchCount: 120,
  };
}

function detailOf(row: MockSupport) {
  const current = row.mappings[row.mappings.length - 1] ?? null;
  return {
    requestId: row.requestId,
    officeId: row.officeId,
    officeName: row.officeName,
    importBatchId: row.importBatchId,
    batchStatus: row.batchStatus,
    rowCount: row.rowCount,
    sourceSystem: row.sourceSystem,
    estimatedRowCount: row.estimatedRowCount,
    quoteAmount: row.quoteAmount,
    scopeNote: row.scopeNote,
    status: row.status,
    assignedOperatorId: row.assignedOperatorId,
    assignedOperatorName: row.assignedOperatorName,
    processingStartedAt: row.processingStartedAt,
    submittedAt: row.submittedAt,
    changeRequestCount: row.changeRequestCount,
    changeRequestReason: row.changeRequestReason,
    changeRequestedAt: row.changeRequestedAt,
    approvedAt: row.approvedAt,
    approvedMappingVersionNo: row.approvedMappingVersionNo,
    executedAt: row.executedAt,
    deliveredAt: row.deliveredAt,
    cancelledAt: null,
    rejectedAt: row.rejectedAt,
    rejectReason: row.rejectReason,
    currentMapping: current,
    sourceColumns: row.sourceColumns,
    mappingHistory: row.mappings.map((entry) => ({
      versionNo: entry.versionNo,
      confirmedByType: entry.confirmedByType,
      confirmedByName: entry.confirmedByName,
      createdAt: entry.createdAt,
    })),
    previewSummary: previewSummary(row),
    allowedActions: allowedActions(row),
    requestedAt: row.requestedAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

function summaryOf(row: MockSupport) {
  return {
    requestId: row.requestId,
    officeId: row.officeId,
    importBatchId: row.importBatchId,
    assignedOperatorName: row.assignedOperatorName,
    sourceSystem: row.sourceSystem,
    estimatedRowCount: row.estimatedRowCount,
    quoteAmount: row.quoteAmount,
    status: row.status,
    requestedAt: row.requestedAt,
    deliveredAt: row.deliveredAt,
  };
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

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null ? Object.fromEntries(Object.entries(body)) : {};
}

function touch(row: MockSupport): void {
  row.version += 1;
  row.updatedAt = new Date().toISOString();
}

function invalid(message = "지금 상태에서는 할 수 없는 처리입니다.") {
  return errorResponse(409, "INVALID_TRANSITION", message);
}

type Gate = { row: MockSupport } | { response: Response };

function gate(id: unknown, request: Request): Gate {
  const rejected = requireMockOps(MIGRATION);
  if (rejected) return { response: rejected };
  const row = find(String(id));
  if (!row) return { response: mockErrors.notFound() };
  const header = request.headers.get("If-Match");
  if (header !== null && Number(header) !== row.version) {
    return { response: mockErrors.versionConflict(row.version) };
  }
  return { row };
}

function transitionBody(row: MockSupport) {
  return {
    requestId: row.requestId,
    status: row.status,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

export const opsMigrationHandlers: RequestHandler[] = [
  http.get("/api/ops/import-support-requests", ({ request }) => {
    const rejected = requireMockOps(MIGRATION);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const mine = url.searchParams.get("assignedToMe") === "true";
    const officeId = url.searchParams.get("officeId");
    const rows = state.rows
      .filter((row) => !status || row.status === status)
      .filter((row) => !mine || isAssignee(row))
      .filter((row) => !officeId || String(row.officeId) === officeId)
      .sort((a, b) => Date.parse(a.requestedAt) - Date.parse(b.requestedAt));
    return HttpResponse.json(pageOf(rows.map(summaryOf), url));
  }),

  http.get("/api/ops/import-support-requests/:id", ({ params }) => {
    const rejected = requireMockOps(MIGRATION);
    if (rejected) return rejected;
    const row = find(String(params.id));
    if (!row) return mockErrors.notFound();
    if (row.batchStatus === "EXECUTING") {
      const polls = (state.executePolls.get(row.requestId) ?? 0) + 1;
      state.executePolls.set(row.requestId, polls);
      if (polls >= 3) row.batchStatus = "COMPLETED";
    }
    return HttpResponse.json(detailOf(row));
  }),

  http.post("/api/ops/import-support-requests/:id/quote", async ({ params, request }) => {
    const result = gate(params.id, request);
    if ("response" in result) return result.response;
    const { row } = result;
    const body = await readBody(request);
    const amount = body.quoteAmount;
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
      return mockErrors.validation([
        { field: "quoteAmount", message: "견적 금액을 확인해 주세요." },
      ]);
    }
    if (typeof body.scopeNote === "string" && body.scopeNote.length > 500) {
      return mockErrors.validation([{ field: "scopeNote", message: "범위 비고가 너무 깁니다." }]);
    }
    if (row.status !== "REQUESTED" && row.status !== "QUOTED") return invalid();
    row.quoteAmount = amount;
    row.scopeNote = typeof body.scopeNote === "string" ? body.scopeNote : null;
    row.status = "QUOTED";
    touch(row);
    return HttpResponse.json(
      {
        requestId: row.requestId,
        officeId: row.officeId,
        sourceSystem: row.sourceSystem,
        estimatedRowCount: row.estimatedRowCount,
        quoteAmount: row.quoteAmount,
        status: row.status,
        requestedAt: row.requestedAt,
        deliveredAt: null,
      },
      { status: 201 },
    );
  }),

  http.post("/api/ops/import-support-requests/:id/reject", async ({ params, request }) => {
    const result = gate(params.id, request);
    if ("response" in result) return result.response;
    const { row } = result;
    const body = await readBody(request);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason === "") {
      return mockErrors.validation([{ field: "reason", message: "거절 사유를 입력해 주세요." }]);
    }
    if (row.status !== "REQUESTED" && row.status !== "QUOTED") return invalid();
    row.status = "REJECTED";
    row.rejectReason = reason;
    row.rejectedAt = new Date().toISOString();
    touch(row);
    return HttpResponse.json({ ...transitionBody(row), rejectedAt: row.rejectedAt });
  }),

  http.post("/api/ops/import-support-requests/:id/start", ({ params, request }) => {
    const result = gate(params.id, request);
    if ("response" in result) return result.response;
    const { row } = result;
    if (row.status !== "PAID") return invalid();
    const operator = getMockOperator();
    row.status = "PROCESSING";
    row.assignedOperatorId = operator?.operatorId ?? SELF;
    row.assignedOperatorName = operator?.name ?? "운영 김사이";
    row.processingStartedAt = new Date().toISOString();
    touch(row);
    return HttpResponse.json({
      ...transitionBody(row),
      assignedOperatorId: row.assignedOperatorId,
      processingStartedAt: row.processingStartedAt,
    });
  }),

  http.put("/api/ops/import-support-requests/:id/mapping", async ({ params, request }) => {
    const result = gate(params.id, request);
    if ("response" in result) return result.response;
    const { row } = result;
    const body = await readBody(request);
    const targetType = typeof body.targetType === "string" ? body.targetType : "";
    const sourceSystem = typeof body.sourceSystem === "string" ? body.sourceSystem.trim() : "";
    const mappings = Array.isArray(body.mappings) ? body.mappings : [];
    if (!isMappingTargetType(targetType) || sourceSystem === "" || mappings.length === 0) {
      return mockErrors.validation([{ field: "mappings", message: "매핑 내용을 확인해 주세요." }]);
    }
    const allowed = new Set(TARGET_FIELDS[targetType].map((field) => field.field));
    const items: MockMapping["items"] = [];
    for (const entry of mappings) {
      const column = typeof entry?.sourceColumn === "string" ? entry.sourceColumn : "";
      const field = typeof entry?.targetField === "string" ? entry.targetField : "";
      if (!row.sourceColumns.includes(column) || !allowed.has(field)) {
        return mockErrors.validation([
          { field: "mappings[].targetField", message: "허용되지 않는 대상 필드입니다." },
        ]);
      }
      items.push({ sourceColumn: column, targetField: field, confidence: null });
    }
    if (row.status !== "PROCESSING") return invalid("승인 이후에는 매핑을 저장할 수 없습니다.");
    if (!isAssignee(row)) return mockErrors.forbidden();
    const versionNo = (row.mappings[row.mappings.length - 1]?.versionNo ?? 0) + 1;
    row.mappings.push({
      versionNo,
      sourceSystem,
      targetType,
      confirmedByType: "OPERATOR",
      confirmedByName: getMockOperator()?.name ?? "운영 김사이",
      createdAt: new Date().toISOString(),
      items,
    });
    touch(row);
    return HttpResponse.json({
      requestId: row.requestId,
      status: row.status,
      mappingVersionNo: versionNo,
      previewSummary: previewSummary(row),
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }),

  http.post("/api/ops/import-support-requests/:id/submit-review", ({ params, request }) => {
    const result = gate(params.id, request);
    if ("response" in result) return result.response;
    const { row } = result;
    if (row.status !== "PROCESSING") return invalid();
    if (!isAssignee(row)) return mockErrors.forbidden();
    const latest = row.mappings[row.mappings.length - 1];
    if (!latest) return errorResponse(409, "MAPPING_REQUIRED", "확정된 매핑이 없습니다.");
    row.status = "REVIEW";
    row.submittedAt = new Date().toISOString();
    touch(row);
    return HttpResponse.json({
      ...transitionBody(row),
      submittedMappingVersionNo: latest.versionNo,
      submittedAt: row.submittedAt,
    });
  }),

  http.post("/api/ops/import-support-requests/:id/execute", ({ params, request }) => {
    const result = gate(params.id, request);
    if ("response" in result) return result.response;
    const { row } = result;
    if (row.status !== "APPROVED" || row.batchStatus !== "PREVIEW") return invalid();
    if (!isAssignee(row)) return mockErrors.forbidden();
    const latest = row.mappings[row.mappings.length - 1];
    if (latest?.versionNo !== row.approvedMappingVersionNo) {
      return errorResponse(
        409,
        "APPROVED_MAPPING_MISMATCH",
        "대표가 승인한 매핑 버전과 최신 매핑 버전이 다릅니다.",
      );
    }
    row.batchStatus = "EXECUTING";
    row.executedAt = new Date().toISOString();
    state.executePolls.set(row.requestId, 0);
    touch(row);
    return HttpResponse.json(
      {
        requestId: row.requestId,
        importBatchId: row.importBatchId,
        status: row.status,
        batchStatus: row.batchStatus,
        approvedMappingVersionNo: row.approvedMappingVersionNo,
        updatedAt: row.updatedAt,
        version: row.version,
      },
      { status: 202 },
    );
  }),

  http.post("/api/ops/import-support-requests/:id/deliver", ({ params, request }) => {
    const result = gate(params.id, request);
    if ("response" in result) return result.response;
    const { row } = result;
    if (row.status !== "APPROVED" || row.batchStatus !== "COMPLETED") return invalid();
    if (!isAssignee(row)) return mockErrors.forbidden();
    row.status = "DELIVERED";
    row.deliveredAt = new Date().toISOString();
    touch(row);
    return HttpResponse.json({
      requestId: row.requestId,
      officeId: row.officeId,
      sourceSystem: row.sourceSystem,
      estimatedRowCount: row.estimatedRowCount,
      quoteAmount: row.quoteAmount,
      status: row.status,
      requestedAt: row.requestedAt,
      deliveredAt: row.deliveredAt,
    });
  }),
];
