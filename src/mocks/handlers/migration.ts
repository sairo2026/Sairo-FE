import { http, HttpResponse } from "msw";
import type {
  ImportBatchListResponse,
  ImportMappingSuggestionResponse,
} from "@/lib/api/contracts/migration.schema";
import type { ImportBatchDetail, ImportPreview, PreviewRow } from "@/features/migration/api/wire";
import { errorResponse, mockErrors } from "../error-responses";

const NOW = "2026-11-10T09:00:00+09:00";

export type MockBatch = {
  detail: ImportBatchDetail;
  sheets: Array<{ name: string; rowCount: number; columnCount: number }>;
  selectedSheetName: string;
  supportRequestId: number | null;
  supportRequestStatus: string | null;
  mappingSaved: boolean;
  executeTicks: number;
};

export type MockMigrationState = {
  callerRole: "OWNER" | "AGENT";
  remainingThisMonth: number;
  batches: MockBatch[];
  nextBatchId: number;
  notCancelled: Array<{ entityType: string; entityId: number; reason: string }>;
  previewRowCount: number;
};

export function buildMockBatch(overrides: Partial<ImportBatchDetail> = {}): MockBatch {
  const batchId = overrides.batchId ?? 301;
  return {
    detail: {
      batchId,
      fileName: "고객목록.xlsx",
      targetType: "CUSTOMER",
      status: "UPLOADED",
      rowCount: 60,
      counts: null,
      executedAt: null,
      cancellableUntil: null,
      cancelledAt: null,
      failureReason: null,
      cancelSummary: null,
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: 1,
      ...overrides,
    },
    sheets: [
      { name: "고객", rowCount: 60, columnCount: 5 },
      { name: "메모", rowCount: 10, columnCount: 2 },
    ],
    selectedSheetName: "고객",
    supportRequestId: null,
    supportRequestStatus: null,
    mappingSaved: false,
    executeTicks: 0,
  };
}

function initialState(): MockMigrationState {
  return {
    callerRole: "OWNER",
    remainingThisMonth: 3,
    batches: [
      buildMockBatch({
        batchId: 301,
        status: "COMPLETED",
        counts: { total: 60, succeeded: 55, failed: 5, unprocessed: 0 },
        executedAt: "2026-11-09T10:30:00+09:00",
        cancellableUntil: "2026-11-11T10:30:00+09:00",
        failureReason: "5건이 형식 오류로 실패했습니다.",
        version: 3,
      }),
      buildMockBatch({ batchId: 302, fileName: "매물목록.csv", targetType: "PROPERTY" }),
    ],
    nextBatchId: 400,
    notCancelled: [{ entityType: "CUSTOMER", entityId: 9001, reason: "EXTERNAL_LINK" }],
    previewRowCount: 60,
  };
}

export const migrationState: MockMigrationState = initialState();

export function resetMigrationState() {
  Object.assign(migrationState, initialState());
}

const CUSTOMER_FIELDS = [
  { field: "customerSourceId", label: "원본 고객 ID", type: "string", required: true },
  { field: "customerName", label: "고객명", type: "string", required: true },
  { field: "customerPhone", label: "연락처", type: "string", required: false },
  { field: "customerEmail", label: "이메일", type: "string", required: false },
  { field: "customerMemo", label: "고객 메모", type: "string", required: false },
];

const PROPERTY_FIELDS = [
  { field: "propertySourceId", label: "원본 매물 ID", type: "string", required: true },
  { field: "propertyName", label: "매물명", type: "string", required: true },
  { field: "propertyAddress", label: "기본주소", type: "string", required: false },
];

export function mockSuggestion(targetType: string): ImportMappingSuggestionResponse {
  const isProperty = targetType === "PROPERTY";
  return {
    sourceColumns: isProperty
      ? [
          { name: "번호", sampleValues: ["P-1", "P-2"], mappedTargetField: "propertySourceId" },
          {
            name: "건물명",
            sampleValues: ["해든빌", "서울타워"],
            mappedTargetField: "propertyName",
          },
          { name: "비고", sampleValues: ["급매"], mappedTargetField: null },
        ]
      : [
          {
            name: "고객번호",
            sampleValues: ["C-1", "C-2", "C-3"],
            mappedTargetField: "customerSourceId",
          },
          { name: "성명", sampleValues: ["김가나", "이다라"], mappedTargetField: "customerName" },
          {
            name: "연락처",
            sampleValues: ["010-1234-5678"],
            mappedTargetField: "customerPhone",
          },
          { name: "기타", sampleValues: ["참고"], mappedTargetField: null },
        ],
    suggestedMappings: isProperty
      ? [
          { sourceColumn: "번호", targetField: "propertySourceId", confidence: 0.95 },
          { sourceColumn: "건물명", targetField: "propertyName", confidence: 0.9 },
        ]
      : [
          { sourceColumn: "고객번호", targetField: "customerSourceId", confidence: 0.97 },
          { sourceColumn: "성명", targetField: "customerName", confidence: 0.93 },
          { sourceColumn: "연락처", targetField: "customerPhone", confidence: 0.88 },
        ],
    availableTargetFields:
      targetType === "CONTRACT" ? [] : isProperty ? PROPERTY_FIELDS : CUSTOMER_FIELDS,
  };
}

function previewRow(index: number): PreviewRow {
  const number = index + 1;
  const hasError = number % 7 === 0;
  const hasWarning = !hasError && number % 5 === 0;
  return {
    sourceRowNumber: number + 1,
    sourceValues: { 고객번호: `C-${number}`, 성명: hasError ? null : `고객${number}` },
    normalizedValues: {
      customerSourceId: `C-${number}`,
      customerName: hasError ? null : `고객${number}`,
    },
    unitConversions: [],
    relationMatches:
      number % 10 === 0
        ? [{ sourceField: "성명", targetType: "CUSTOMER", targetId: 77, confidence: 0.8 }]
        : [],
    warnings: hasError
      ? [
          {
            code: "REQUIRED_VALUE_MISSING",
            field: "customerName",
            message: "고객명이 비어 있습니다.",
            severity: "ERROR",
          },
        ]
      : hasWarning
        ? [
            {
              code: "PHONE_FORMAT",
              field: "customerPhone",
              message: "연락처 형식을 바꿨습니다.",
              severity: "WARNING",
            },
          ]
        : [],
  };
}

function findBatch(id: string | readonly string[] | undefined): MockBatch | undefined {
  return migrationState.batches.find((batch) => String(batch.detail.batchId) === String(id));
}

function denied() {
  return migrationState.callerRole === "OWNER" ? null : mockErrors.forbidden();
}

function toListItem(batch: MockBatch): ImportBatchListResponse["items"][number] {
  const { detail } = batch;
  return {
    batchId: detail.batchId,
    fileName: detail.fileName,
    targetType: detail.targetType,
    status: detail.status,
    createdAt: detail.createdAt,
    rowCount: detail.rowCount ?? null,
    executedAt: detail.executedAt ?? null,
    cancellableUntil: detail.cancellableUntil ?? null,
    supportRequestId: batch.supportRequestId,
    supportRequestStatus: batch.supportRequestStatus,
    eligibleForSupport:
      ["UPLOADED", "MAPPING", "PREVIEW"].includes(detail.status) && batch.supportRequestId === null,
    officeId: detail.officeId,
    updatedAt: detail.updatedAt,
    version: detail.version,
  };
}

function isManaged(batch: MockBatch) {
  return (
    batch.supportRequestId !== null &&
    !["CANCELLED", "REJECTED"].includes(batch.supportRequestStatus ?? "")
  );
}

function advanceExecution(batch: MockBatch) {
  if (batch.detail.status !== "EXECUTING") return;
  const total = batch.detail.counts?.total ?? 60;
  batch.executeTicks += 1;
  const done = Math.min(total, batch.executeTicks * 30);
  const failed = Math.floor(done / 12);
  batch.detail.counts = { total, succeeded: done - failed, failed, unprocessed: total - done };
  if (done >= total) {
    batch.detail.status = "COMPLETED";
    batch.detail.executedAt = NOW;
    batch.detail.cancellableUntil = "2026-11-11T09:00:00+09:00";
    batch.detail.failureReason = failed > 0 ? `${failed}건이 형식 오류로 실패했습니다.` : null;
  }
}

const EDITABLE = ["UPLOADED", "MAPPING", "PREVIEW"];

export const migrationHandlers = [
  http.get("/api/import-batches", () => {
    const blocked = denied();
    if (blocked) return blocked;
    const body: ImportBatchListResponse = {
      items: migrationState.batches.map(toListItem),
      remainingThisMonth: migrationState.remainingThisMonth,
    };
    return HttpResponse.json(body);
  }),

  http.post("/api/import-batches", async ({ request }) => {
    const blocked = denied();
    if (blocked) return blocked;
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const targetType = String(form?.get("targetType") ?? "CUSTOMER");
    const fileName = file && typeof file !== "string" ? file.name : "업로드한 파일.xlsx";
    const name = fileName.toLowerCase();
    if (!/\.(xls|xlsx|csv)$/.test(name)) {
      return errorResponse(400, "UNSUPPORTED_FILE_TYPE", "지원하지 않는 형식입니다.");
    }
    const batch = buildMockBatch({
      batchId: migrationState.nextBatchId,
      fileName,
      targetType,
    });
    migrationState.nextBatchId += 1;
    migrationState.batches.unshift(batch);
    return HttpResponse.json(
      {
        batchId: batch.detail.batchId,
        status: "UPLOADED",
        fileName: batch.detail.fileName,
        sheets: batch.sheets,
        selectedSheetName: batch.selectedSheetName,
        officeId: 12,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/import-batches/:batchId", ({ params }) => {
    const blocked = denied();
    if (blocked) return blocked;
    const batch = findBatch(params.batchId);
    if (!batch) return mockErrors.notFound();
    advanceExecution(batch);
    return HttpResponse.json(batch.detail);
  }),

  http.put("/api/import-batches/:batchId/sheet", async ({ params, request }) => {
    const blocked = denied();
    if (blocked) return blocked;
    const batch = findBatch(params.batchId);
    if (!batch) return mockErrors.notFound();
    if (isManaged(batch)) {
      return errorResponse(409, "IMPORT_MANAGED_BY_SUPPORT", "지원 신청 중입니다.");
    }
    if (!EDITABLE.includes(batch.detail.status)) {
      return errorResponse(409, "INVALID_TRANSITION", "변경할 수 없는 상태입니다.");
    }
    const match = request.headers.get("If-Match");
    if (match === null) return errorResponse(400, "INVALID_REQUEST", "If-Match가 필요합니다.");
    if (Number(match) !== batch.detail.version) {
      return mockErrors.versionConflict(batch.detail.version);
    }
    const body = (await request.json()) as { sheetName: string };
    const sheet = batch.sheets.find((item) => item.name === body.sheetName);
    if (!sheet) return mockErrors.validation([{ field: "sheetName", message: "없는 시트입니다." }]);
    batch.selectedSheetName = sheet.name;
    batch.detail.rowCount = sheet.rowCount;
    batch.detail.version += 1;
    return HttpResponse.json({
      batchId: batch.detail.batchId,
      status: batch.detail.status,
      fileName: batch.detail.fileName,
      sheets: batch.sheets,
      selectedSheetName: batch.selectedSheetName,
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: batch.detail.version,
    });
  }),

  http.get("/api/import-batches/:batchId/mapping-suggestion", ({ params }) => {
    const blocked = denied();
    if (blocked) return blocked;
    const batch = findBatch(params.batchId);
    if (!batch) return mockErrors.notFound();
    return HttpResponse.json(mockSuggestion(batch.detail.targetType));
  }),

  http.put("/api/import-batches/:batchId/mapping", async ({ params, request }) => {
    const blocked = denied();
    if (blocked) return blocked;
    const batch = findBatch(params.batchId);
    if (!batch) return mockErrors.notFound();
    if (isManaged(batch)) {
      return errorResponse(409, "IMPORT_MANAGED_BY_SUPPORT", "지원 신청 중입니다.");
    }
    if (!EDITABLE.includes(batch.detail.status)) {
      return errorResponse(409, "INVALID_TRANSITION", "변경할 수 없는 상태입니다.");
    }
    const body = (await request.json()) as { mappings: unknown[]; sourceSystem: string };
    if (!body.sourceSystem?.trim()) {
      return mockErrors.validation([
        { field: "sourceSystem", message: "원본 시스템 이름이 필요합니다." },
      ]);
    }
    batch.mappingSaved = true;
    batch.detail.status = "MAPPING";
    batch.detail.version += 1;
    return HttpResponse.json({
      batchId: batch.detail.batchId,
      officeId: 12,
      status: "MAPPING",
      rowCount: null,
      executedAt: null,
      cancellableUntil: null,
      cancelledAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      version: batch.detail.version,
    });
  }),

  http.get("/api/import-batches/:batchId/preview", ({ params, request }) => {
    const blocked = denied();
    if (blocked) return blocked;
    const batch = findBatch(params.batchId);
    if (!batch) return mockErrors.notFound();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 25);
    const total = migrationState.previewRowCount;
    const all = Array.from({ length: total }, (_, index) => previewRow(index));
    const errorRows = all.filter((row) => row.warnings?.some((w) => w.severity === "ERROR")).length;
    const warningRows = all.filter((row) =>
      row.warnings?.some((w) => w.severity === "WARNING"),
    ).length;
    const body: ImportPreview = {
      rows: all.slice(page * size, page * size + size),
      duplicateWarnings: [
        {
          sourceRowNumber: 12,
          sourceSystem: "양셀-2026",
          sourceType: "CUSTOMER",
          sourceId: "C-11",
          existingTargetId: 88,
        },
      ],
      summary: {
        rowCount: total,
        errorRowCount: errorRows,
        warningCount: warningRows,
        duplicateCount: 1,
        relationMatchCount: all.filter((row) => (row.relationMatches?.length ?? 0) > 0).length,
      },
      page,
      size,
      totalElements: total,
    };
    return HttpResponse.json(body);
  }),

  http.post("/api/import-batches/:batchId/execute", ({ params }) => {
    const blocked = denied();
    if (blocked) return blocked;
    const batch = findBatch(params.batchId);
    if (!batch) return mockErrors.notFound();
    if (isManaged(batch)) {
      return errorResponse(409, "IMPORT_MANAGED_BY_SUPPORT", "지원 신청 중입니다.");
    }
    if (!["MAPPING", "PREVIEW"].includes(batch.detail.status) || !batch.mappingSaved) {
      return errorResponse(409, "INVALID_TRANSITION", "매핑을 먼저 확정해 주세요.");
    }
    if (migrationState.remainingThisMonth <= 0) {
      return errorResponse(429, "IMPORT_QUOTA_EXCEEDED", "이번 달 한도를 모두 사용했습니다.");
    }
    migrationState.remainingThisMonth -= 1;
    batch.detail.status = "EXECUTING";
    batch.detail.counts = {
      total: migrationState.previewRowCount,
      succeeded: 0,
      failed: 0,
      unprocessed: migrationState.previewRowCount,
    };
    batch.executeTicks = 0;
    batch.detail.version += 1;
    return HttpResponse.json({
      batchId: batch.detail.batchId,
      status: "EXECUTING",
      cancellableUntil: null,
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: batch.detail.version,
    });
  }),

  http.post("/api/import-batches/:batchId/cancel", ({ params }) => {
    const blocked = denied();
    if (blocked) return blocked;
    const batch = findBatch(params.batchId);
    if (!batch) return mockErrors.notFound();
    if (batch.detail.status !== "COMPLETED") {
      return errorResponse(409, "IMPORT_NOT_CANCELLABLE", "취소할 수 없습니다.");
    }
    const cancelledCount = batch.detail.counts?.succeeded ?? 0;
    batch.detail.status = "CANCELLED";
    batch.detail.cancelledAt = NOW;
    batch.detail.cancelSummary = { cancelledCount, notCancelled: migrationState.notCancelled };
    batch.detail.version += 1;
    return HttpResponse.json({
      batchId: batch.detail.batchId,
      officeId: 12,
      status: "CANCELLED",
      cancelledCount,
      notCancelled: migrationState.notCancelled,
      rowCount: null,
      executedAt: null,
      cancellableUntil: null,
      cancelledAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
      version: batch.detail.version,
    });
  }),

  http.post("/api/import-batches/:batchId/retry-failed", ({ params }) => {
    const blocked = denied();
    if (blocked) return blocked;
    const batch = findBatch(params.batchId);
    if (!batch) return mockErrors.notFound();
    if (batch.detail.status !== "COMPLETED" || (batch.detail.counts?.failed ?? 0) === 0) {
      return errorResponse(409, "INVALID_TRANSITION", "다시 처리할 실패 건이 없습니다.");
    }
    const counts = batch.detail.counts;
    if (counts) {
      batch.detail.counts = {
        ...counts,
        succeeded: counts.succeeded + counts.failed,
        failed: 0,
      };
    }
    batch.detail.failureReason = null;
    batch.detail.version += 1;
    return HttpResponse.json({
      batchId: batch.detail.batchId,
      status: "COMPLETED",
      cancellableUntil: batch.detail.cancellableUntil ?? null,
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
      version: batch.detail.version,
    });
  }),
];
