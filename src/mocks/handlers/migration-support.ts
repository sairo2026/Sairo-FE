import { http, HttpResponse } from "msw";
import type {
  ExportAllowedTablesResponse,
  ExportListResponse,
  ExportResultResponse,
} from "@/lib/api/contracts/migration.schema";
import type { ImportSupportDetail } from "@/features/migration/api/wire";
import { errorResponse, mockErrors } from "../error-responses";
import { migrationState } from "./migration";

const NOW = "2026-11-10T09:00:00+09:00";

export const MOCK_EXPORT_TABLES = [
  { code: "PROPERTY", label: "매물" },
  { code: "CUSTOMER", label: "고객" },
  { code: "CONTRACT", label: "계약" },
  { code: "FEE", label: "수수료" },
  { code: "PAYMENT", label: "잔금·지급" },
  { code: "TASK", label: "업무" },
  { code: "VISIT", label: "방문" },
];

export type MockSupportState = {
  requests: ImportSupportDetail[];
  nextRequestId: number;
  exports: Array<ExportResultResponse & { scope: string; createdAt: string; polls: number }>;
  nextExportId: number;
  exportPolicy: string[];
  stepUpValid: boolean;
};

export function buildMockSupportRequest(
  overrides: Partial<ImportSupportDetail> = {},
): ImportSupportDetail {
  return {
    requestId: 401,
    importBatchId: 302,
    sourceSystem: "양셀-2026",
    estimatedRowCount: 3000,
    quoteAmount: null,
    status: "REQUESTED",
    assignedOperatorName: null,
    processingStartedAt: null,
    submittedAt: null,
    changeRequestCount: 0,
    changeRequestReason: null,
    changeRequestedAt: null,
    approvedAt: null,
    approvedMappingVersionNo: null,
    deliveredAt: null,
    cancelledAt: null,
    cancelReason: null,
    rejectedAt: null,
    rejectReason: null,
    directWorkAllowed: false,
    allowedActions: [],
    batchStatus: "UPLOADED",
    executionResult: null,
    submittedMapping: null,
    previewSummary: null,
    scopeNote: null,
    requestedAt: NOW,
    updatedAt: NOW,
    version: 1,
    ...overrides,
  };
}

function initialState(): MockSupportState {
  return {
    requests: [],
    nextRequestId: 500,
    exports: [
      {
        exportId: 901,
        scope: "TABLES",
        status: "COMPLETED",
        createdAt: "2026-11-10T08:00:00+09:00",
        fileExpiresAt: "2026-11-11T08:00:00+09:00",
        downloadUrl: "https://files.example.test/signed/901",
        expiresAt: "2026-11-10T09:10:00+09:00",
        failureReason: null,
        polls: 1,
      },
    ],
    nextExportId: 910,
    exportPolicy: ["CUSTOMER"],
    stepUpValid: true,
  };
}

export const supportState: MockSupportState = initialState();

export function resetSupportState() {
  Object.assign(supportState, initialState());
}

function ownerOnly() {
  return migrationState.callerRole === "OWNER" ? null : mockErrors.forbidden();
}

function findRequest(id: string | readonly string[] | undefined) {
  return supportState.requests.find((item) => String(item.requestId) === String(id));
}

function touch(item: ImportSupportDetail) {
  item.version += 1;
  item.updatedAt = NOW;
}

function syncBatch(item: ImportSupportDetail) {
  const batch = migrationState.batches.find((entry) => entry.detail.batchId === item.importBatchId);
  if (batch) {
    batch.supportRequestId = item.requestId;
    batch.supportRequestStatus = item.status;
  }
  item.directWorkAllowed = ["CANCELLED", "REJECTED"].includes(item.status);
}

function checkMatch(request: Request, item: ImportSupportDetail) {
  const match = request.headers.get("If-Match");
  if (match === null) return errorResponse(400, "INVALID_REQUEST", "If-Match가 필요합니다.");
  if (Number(match) !== item.version) return mockErrors.versionConflict(item.version);
  return null;
}

export const migrationSupportHandlers = [
  http.get("/api/import-support-requests", ({ request }) => {
    const blocked = ownerOnly();
    if (blocked) return blocked;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 25);
    const filtered = supportState.requests.filter((item) => !status || item.status === status);
    return HttpResponse.json({
      items: filtered.slice(page * size, page * size + size).map((item) => ({
        requestId: item.requestId,
        importBatchId: item.importBatchId,
        sourceSystem: item.sourceSystem,
        status: item.status,
        quoteAmount: item.quoteAmount ?? null,
        updatedAt: item.updatedAt,
      })),
      page,
      size,
      totalElements: filtered.length,
    });
  }),

  http.post("/api/import-support-requests", async ({ request }) => {
    const blocked = ownerOnly();
    if (blocked) return blocked;
    const body = (await request.json()) as {
      importBatchId: number;
      sourceSystem: string;
      estimatedRowCount: number;
    };
    const batch = migrationState.batches.find(
      (entry) => entry.detail.batchId === body.importBatchId,
    );
    if (!batch) return mockErrors.notFound();
    if (
      batch.supportRequestId !== null &&
      !["CANCELLED", "REJECTED"].includes(batch.supportRequestStatus ?? "")
    ) {
      return errorResponse(409, "IMPORT_BATCH_ALREADY_LINKED", "이미 연결된 파일입니다.");
    }
    if (!["UPLOADED", "MAPPING", "PREVIEW"].includes(batch.detail.status)) {
      return errorResponse(409, "INVALID_TRANSITION", "신청할 수 없는 상태입니다.");
    }
    const item = buildMockSupportRequest({
      requestId: supportState.nextRequestId,
      importBatchId: body.importBatchId,
      sourceSystem: body.sourceSystem,
      estimatedRowCount: body.estimatedRowCount,
      batchStatus: batch.detail.status,
    });
    supportState.nextRequestId += 1;
    supportState.requests.unshift(item);
    syncBatch(item);
    return HttpResponse.json(
      {
        requestId: item.requestId,
        importBatchId: item.importBatchId,
        status: "REQUESTED",
        quoteAmount: null,
        updatedAt: NOW,
        version: 1,
      },
      { status: 200 },
    );
  }),

  http.get("/api/import-support-requests/:requestId", ({ params }) => {
    const blocked = ownerOnly();
    if (blocked) return blocked;
    const item = findRequest(params.requestId);
    return item ? HttpResponse.json(item) : mockErrors.notFound();
  }),

  http.post("/api/import-support-requests/:requestId/accept-quote", ({ params }) => {
    const blocked = ownerOnly();
    if (blocked) return blocked;
    const item = findRequest(params.requestId);
    if (!item) return mockErrors.notFound();
    if (item.status !== "QUOTED" && item.status !== "ACCEPTED") {
      return errorResponse(409, "INVALID_TRANSITION", "견적을 수락할 수 없는 상태입니다.");
    }
    item.status = "ACCEPTED";
    touch(item);
    syncBatch(item);
    return HttpResponse.json({
      requestId: item.requestId,
      officeId: 12,
      sourceSystem: item.sourceSystem,
      estimatedRowCount: item.estimatedRowCount,
      quoteAmount: item.quoteAmount ?? 220000,
      paymentOrderId: `IMPORT-${item.requestId}-1`,
      paymentAmount: item.quoteAmount ?? 220000,
      status: "ACCEPTED",
      requestedAt: item.requestedAt,
      deliveredAt: null,
    });
  }),

  http.post(
    "/api/import-support-requests/:requestId/payment/confirm",
    async ({ params, request }) => {
      const blocked = ownerOnly();
      if (blocked) return blocked;
      const item = findRequest(params.requestId);
      if (!item) return mockErrors.notFound();
      if (item.status !== "ACCEPTED") {
        return errorResponse(409, "INVALID_TRANSITION", "결제할 수 없는 상태입니다.");
      }
      const body = (await request.json()) as {
        paymentKey: string;
        orderId: string;
        amount: number;
      };
      if (body.paymentKey === "FAIL" || body.amount !== (item.quoteAmount ?? 220000)) {
        return errorResponse(402, "PAYMENT_FAILED", "결제가 승인되지 않았습니다.");
      }
      if (body.paymentKey === "VERIFYING") {
        return errorResponse(409, "PAYMENT_VERIFYING", "결제 확인 중입니다.");
      }
      item.status = "PAID";
      touch(item);
      syncBatch(item);
      return HttpResponse.json({
        requestId: item.requestId,
        status: "PAID",
        paidAt: NOW,
        updatedAt: NOW,
        version: item.version,
      });
    },
  ),

  http.post("/api/import-support-requests/:requestId/approve", ({ params, request }) => {
    const blocked = ownerOnly();
    if (blocked) return blocked;
    const item = findRequest(params.requestId);
    if (!item) return mockErrors.notFound();
    const mismatch = checkMatch(request, item);
    if (mismatch) return mismatch;
    if (item.status !== "REVIEW") {
      return errorResponse(409, "INVALID_TRANSITION", "승인할 수 없는 상태입니다.");
    }
    item.status = "APPROVED";
    item.approvedAt = NOW;
    item.approvedMappingVersionNo = item.submittedMapping?.versionNo ?? 1;
    touch(item);
    syncBatch(item);
    return HttpResponse.json({
      requestId: item.requestId,
      status: "APPROVED",
      approvedMappingVersionNo: item.approvedMappingVersionNo,
      approvedAt: NOW,
      updatedAt: NOW,
      version: item.version,
    });
  }),

  http.post(
    "/api/import-support-requests/:requestId/request-changes",
    async ({ params, request }) => {
      const blocked = ownerOnly();
      if (blocked) return blocked;
      const item = findRequest(params.requestId);
      if (!item) return mockErrors.notFound();
      const mismatch = checkMatch(request, item);
      if (mismatch) return mismatch;
      if (item.status !== "REVIEW") {
        return errorResponse(409, "INVALID_TRANSITION", "수정을 요청할 수 없는 상태입니다.");
      }
      if (item.changeRequestCount >= 1) {
        return errorResponse(409, "CHANGE_REQUEST_LIMIT_EXCEEDED", "수정 요청 한도를 넘었습니다.");
      }
      const body = (await request.json()) as { reason: string };
      if (!body.reason?.trim())
        return mockErrors.validation([{ field: "reason", message: "사유가 필요합니다." }]);
      item.status = "PROCESSING";
      item.changeRequestCount += 1;
      item.changeRequestReason = body.reason;
      item.changeRequestedAt = NOW;
      touch(item);
      syncBatch(item);
      return HttpResponse.json({
        requestId: item.requestId,
        status: "PROCESSING",
        changeRequestCount: item.changeRequestCount,
        changeRequestedAt: NOW,
        updatedAt: NOW,
        version: item.version,
      });
    },
  ),

  http.post("/api/import-support-requests/:requestId/cancel", async ({ params, request }) => {
    const blocked = ownerOnly();
    if (blocked) return blocked;
    const item = findRequest(params.requestId);
    if (!item) return mockErrors.notFound();
    const mismatch = checkMatch(request, item);
    if (mismatch) return mismatch;
    if (!["REQUESTED", "QUOTED", "ACCEPTED"].includes(item.status)) {
      return errorResponse(409, "INVALID_TRANSITION", "결제 후에는 취소할 수 없습니다.");
    }
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    item.status = "CANCELLED";
    item.cancelledAt = NOW;
    item.cancelReason = body.reason ?? null;
    touch(item);
    syncBatch(item);
    return HttpResponse.json({
      requestId: item.requestId,
      status: "CANCELLED",
      cancelledAt: NOW,
      importBatchId: item.importBatchId,
      directWorkAllowed: true,
      updatedAt: NOW,
      version: item.version,
    });
  }),

  http.get("/api/exports", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 25);
    const body: ExportListResponse = {
      items: supportState.exports.slice(page * size, page * size + size).map((item) => ({
        exportId: item.exportId,
        scope: item.scope,
        status: item.status,
        createdAt: item.createdAt,
        fileExpiresAt: item.fileExpiresAt,
      })),
      page,
      size,
      totalElements: supportState.exports.length,
    };
    return HttpResponse.json(body);
  }),

  http.get("/api/exports/allowed-tables", () => {
    const tables =
      migrationState.callerRole === "OWNER"
        ? MOCK_EXPORT_TABLES.map((table) => ({
            ...table,
            allowed: supportState.exportPolicy.includes(table.code),
          }))
        : MOCK_EXPORT_TABLES.filter((table) => supportState.exportPolicy.includes(table.code)).map(
            (table) => ({ ...table, allowed: true }),
          );
    const body: ExportAllowedTablesResponse = { tables };
    return HttpResponse.json(body);
  }),

  http.post("/api/exports", async ({ request }) => {
    const body = (await request.json()) as { scope: string; tables?: string[] };
    if (body.scope === "FULL") {
      if (migrationState.callerRole !== "OWNER") return mockErrors.forbidden();
      if (!supportState.stepUpValid) return mockErrors.stepUpRequired();
    } else {
      const allowed =
        migrationState.callerRole === "OWNER"
          ? MOCK_EXPORT_TABLES.map((table) => table.code)
          : supportState.exportPolicy;
      if (
        !body.tables ||
        body.tables.length === 0 ||
        body.tables.some((code) => !allowed.includes(code))
      ) {
        return migrationState.callerRole === "OWNER"
          ? mockErrors.validation([{ field: "tables", message: "허용되지 않는 표입니다." }])
          : mockErrors.forbidden();
      }
    }
    const created = {
      exportId: supportState.nextExportId,
      scope: body.scope,
      status: "PENDING",
      createdAt: NOW,
      fileExpiresAt: "2026-11-11T09:00:00+09:00",
      downloadUrl: null,
      expiresAt: null,
      failureReason: null,
      polls: 0,
    };
    supportState.nextExportId += 1;
    supportState.exports.unshift(created);
    return HttpResponse.json(
      {
        exportId: created.exportId,
        status: "PENDING",
        downloadUrl: null,
        expiresAt: null,
        fileExpiresAt: created.fileExpiresAt,
      },
      { status: 201 },
    );
  }),

  http.get("/api/exports/:exportId", ({ params }) => {
    const item = supportState.exports.find(
      (entry) => String(entry.exportId) === String(params.exportId),
    );
    if (!item) return mockErrors.notFound();
    if (item.status === "EXPIRED") return errorResponse(410, "EXPORT_EXPIRED", "만료되었습니다.");
    const snapshot: ExportResultResponse = {
      exportId: item.exportId,
      status: item.status,
      downloadUrl: item.downloadUrl,
      expiresAt: item.expiresAt,
      fileExpiresAt: item.fileExpiresAt,
      failureReason: item.failureReason,
    };
    item.polls += 1;
    if (item.status === "PENDING" && item.polls >= 2) {
      item.status = "COMPLETED";
      item.downloadUrl = `https://files.example.test/signed/${item.exportId}`;
      item.expiresAt = "2026-11-10T09:10:00+09:00";
    }
    return HttpResponse.json(snapshot);
  }),

  http.put("/api/offices/current/export-policy", async ({ request }) => {
    const blocked = ownerOnly();
    if (blocked) return blocked;
    const body = (await request.json()) as { allowedTables: string[] };
    if (
      body.allowedTables.some((code) => !MOCK_EXPORT_TABLES.some((table) => table.code === code))
    ) {
      return mockErrors.validation([{ field: "allowedTables", message: "알 수 없는 표입니다." }]);
    }
    supportState.exportPolicy = body.allowedTables;
    return HttpResponse.json({
      tables: MOCK_EXPORT_TABLES.map((table) => ({
        ...table,
        allowed: body.allowedTables.includes(table.code),
      })),
    });
  }),
];
