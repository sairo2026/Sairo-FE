import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockOperator, requireMockOps, requireMockStepUp } from "./ops-session";

type MockGrant = {
  grantId: number;
  executedAt: string;
  expiresAt: string;
  fileSize: number | null;
  fileSha256: string | null;
  downloadedAt: string | null;
  revokedAt: string | null;
  revokedByName: string | null;
  revokeReason: string | null;
};

type MockRequest = {
  requestId: number;
  requestType: "RAW_VIEW" | "RAW_DOWNLOAD";
  targetType: string;
  targetId: number | null;
  purpose: string;
  scope: string;
  status: string;
  requestedByOperatorId: number;
  requestedByName: string;
  beneficiaryOperatorId: number | null;
  approvedByName: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  basisType: string;
  basisNote: string;
  linkedInquiryId: number | null;
  officeId: number | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  grant: MockGrant | null;
};

export const MOCK_KNOWN_OFFICE_IDS = [7, 8, 9, 42];
export const MOCK_KNOWN_INQUIRY_IDS = [18, 19];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const SHA = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

function at(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function request(id: number, patch: Partial<MockRequest>): MockRequest {
  return {
    requestId: id,
    requestType: "RAW_VIEW",
    targetType: "OFFICE",
    targetId: 42,
    purpose: "고객 문의 대응",
    scope: "대표 연락처",
    status: "PENDING",
    requestedByOperatorId: 1,
    requestedByName: "운영 김사이",
    beneficiaryOperatorId: null,
    approvedByName: null,
    approvedAt: null,
    expiresAt: null,
    createdAt: at(-2 * HOUR),
    basisType: "REPRESENTATIVE_REQUEST",
    basisNote: "대표가 전화로 확인을 요청했습니다.",
    linkedInquiryId: 18,
    officeId: 42,
    rejectedByName: null,
    rejectedAt: null,
    rejectReason: null,
    grant: null,
    ...patch,
  };
}

function grant(id: number, patch: Partial<MockGrant>): MockGrant {
  return {
    grantId: id,
    executedAt: at(-10 * MINUTE),
    expiresAt: at(50 * MINUTE),
    fileSize: null,
    fileSha256: null,
    downloadedAt: null,
    revokedAt: null,
    revokedByName: null,
    revokeReason: null,
    ...patch,
  };
}

const approved = {
  status: "APPROVED",
  approvedByName: "박지원",
  approvedAt: at(-HOUR),
  expiresAt: at(23 * HOUR),
};
const file = { fileSize: 20480, fileSha256: SHA };

function seed(): MockRequest[] {
  return [
    request(1, { requestedByOperatorId: 2, requestedByName: "박지원" }),
    request(2, {}),
    request(3, { ...approved }),
    request(4, { ...approved, requestType: "RAW_DOWNLOAD" }),
    request(5, { ...approved, expiresAt: at(-HOUR) }),
    request(6, { ...approved, grant: grant(61, {}) }),
    request(7, { ...approved, requestType: "RAW_DOWNLOAD", grant: grant(71, file) }),
    request(8, {
      ...approved,
      requestType: "RAW_DOWNLOAD",
      grant: grant(81, { ...file, downloadedAt: at(-5 * MINUTE) }),
    }),
    request(9, {
      ...approved,
      grant: grant(91, {
        revokedAt: at(-MINUTE),
        revokedByName: "운영 김사이",
        revokeReason: "요청 철회",
      }),
    }),
    request(10, {
      ...approved,
      grant: grant(101, { executedAt: at(-90 * MINUTE), expiresAt: at(-30 * MINUTE) }),
    }),
    request(11, {
      status: "REJECTED",
      rejectedByName: "박지원",
      rejectedAt: at(-HOUR),
      rejectReason: "근거가 부족합니다.",
    }),
    request(12, { requestedByOperatorId: 2, requestedByName: "박지원", beneficiaryOperatorId: 3 }),
    request(13, { ...approved, status: "INVALIDATED" }),
  ];
}

const state = { requests: seed(), nextId: 20, nextGrantId: 500 };

export function resetMockRawAccess(): void {
  state.requests = seed();
  state.nextId = 20;
  state.nextGrantId = 500;
}

function me(): number {
  return getMockOperator()?.operatorId ?? 0;
}

function hasRole(role: string): boolean {
  return getMockOperator()?.roles.includes(role) ?? false;
}

function summary(row: MockRequest) {
  return {
    requestId: row.requestId,
    requestType: row.requestType,
    targetType: row.targetType,
    targetId: row.targetId,
    purpose: row.purpose,
    scope: row.scope,
    status: row.status,
    requestedByOperatorId: row.requestedByOperatorId,
    requestedByName: row.requestedByName,
    beneficiaryOperatorId: row.beneficiaryOperatorId,
    approvedByName: row.approvedByName,
    approvedAt: row.approvedAt,
    expiresAt: row.expiresAt,
    grantId: row.grant?.grantId ?? null,
    createdAt: row.createdAt,
  };
}

function isMine(row: MockRequest): boolean {
  return row.requestedByOperatorId === me() || row.beneficiaryOperatorId === me();
}

function find(id: string): MockRequest | undefined {
  return state.requests.find((row) => String(row.requestId) === id);
}

function selfApproval(row: MockRequest): boolean {
  return row.requestedByOperatorId === me() || row.beneficiaryOperatorId === me();
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const body: unknown = await req.json().catch(() => null);
  return typeof body === "object" && body !== null ? Object.fromEntries(Object.entries(body)) : {};
}

function reasonOf(body: Record<string, unknown>): string | null {
  return typeof body.reason === "string" && body.reason.trim() !== "" ? body.reason.trim() : null;
}

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

const REQUEST_TYPES = ["RAW_VIEW", "RAW_DOWNLOAD"];
const TARGET_TYPES = ["OFFICE", "MEMBER", "SUPPORT_INQUIRY", "IMPORT_BATCH", "OFFICE_REGISTRATION"];
const BASIS_TYPES = ["REPRESENTATIVE_REQUEST", "LEGAL_BASIS"];

function validateCreate(body: Record<string, unknown>) {
  const errors: { field: string; message: string }[] = [];
  const text = (key: string) => typeof body[key] === "string" && String(body[key]).trim() !== "";
  if (!REQUEST_TYPES.includes(String(body.requestType)))
    errors.push({ field: "requestType", message: "요청 종류를 확인해 주세요." });
  if (!TARGET_TYPES.includes(String(body.targetType)))
    errors.push({ field: "targetType", message: "대상 종류를 확인해 주세요." });
  if (!isInt(body.targetId))
    errors.push({ field: "targetId", message: "대상 ID를 확인해 주세요." });
  if (!text("purpose")) errors.push({ field: "purpose", message: "사유를 입력해 주세요." });
  if (!text("scope")) errors.push({ field: "scope", message: "범위를 입력해 주세요." });
  const minutes = body.requestedExpiresMinutes;
  if (!isInt(minutes) || minutes > 60)
    errors.push({ field: "requestedExpiresMinutes", message: "1분에서 60분 사이여야 합니다." });
  if (!BASIS_TYPES.includes(String(body.basisType)))
    errors.push({ field: "basisType", message: "근거 종류를 확인해 주세요." });
  if (!text("basisNote"))
    errors.push({ field: "basisNote", message: "근거 내용을 입력해 주세요." });
  if (body.basisType === "REPRESENTATIVE_REQUEST" && !isInt(body.linkedInquiryId)) {
    errors.push({ field: "linkedInquiryId", message: "연결 문의가 필요합니다." });
  }
  return errors;
}

export const opsRawAccessHandlers: RequestHandler[] = [
  http.get("/api/ops/raw-access-requests", ({ request: req }) => {
    const rejected = requireMockOps();
    if (rejected) return rejected;
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "MINE";
    const status = url.searchParams.get("status");
    if (scope === "APPROVABLE" && !hasRole("PRIVACY")) return mockErrors.forbidden();
    const rows = state.requests
      .filter((row) =>
        scope === "APPROVABLE" ? row.status === "PENDING" && !selfApproval(row) : isMine(row),
      )
      .filter((row) => (status ? row.status === status : true))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 25);
    return HttpResponse.json({
      items: rows.slice(page * size, page * size + size).map(summary),
      page,
      size,
      totalElements: rows.length,
    });
  }),

  http.post("/api/ops/raw-access-requests", async ({ request: req }) => {
    const rejected = requireMockOps();
    if (rejected) return rejected;
    const body = await readBody(req);
    const errors = validateCreate(body);
    if (errors.length > 0) return mockErrors.validation(errors);
    const officeId = isInt(body.officeId) ? body.officeId : null;
    const inquiryId = isInt(body.linkedInquiryId) ? body.linkedInquiryId : null;
    if (
      (officeId !== null && !MOCK_KNOWN_OFFICE_IDS.includes(officeId)) ||
      (inquiryId !== null && !MOCK_KNOWN_INQUIRY_IDS.includes(inquiryId))
    ) {
      return mockErrors.notFound();
    }
    const operator = getMockOperator();
    const row = request(state.nextId++, {
      requestType: body.requestType === "RAW_DOWNLOAD" ? "RAW_DOWNLOAD" : "RAW_VIEW",
      targetType: String(body.targetType),
      targetId: Number(body.targetId),
      purpose: String(body.purpose),
      scope: String(body.scope),
      requestedByOperatorId: operator?.operatorId ?? 0,
      requestedByName: operator?.name ?? "",
      beneficiaryOperatorId: isInt(body.beneficiaryOperatorId) ? body.beneficiaryOperatorId : null,
      basisType: String(body.basisType),
      basisNote: String(body.basisNote),
      linkedInquiryId: inquiryId,
      officeId,
      createdAt: new Date().toISOString(),
    });
    state.requests.push(row);
    return HttpResponse.json(
      {
        requestId: row.requestId,
        requestType: row.requestType,
        targetType: row.targetType,
        targetId: row.targetId,
        purpose: row.purpose,
        scope: row.scope,
        status: "PENDING",
        beneficiaryOperatorId: row.beneficiaryOperatorId,
        createdAt: row.createdAt,
      },
      { status: 201 },
    );
  }),

  http.get("/api/ops/raw-access-requests/:id", ({ params }) => {
    const rejected = requireMockOps();
    if (rejected) return rejected;
    const row = find(String(params.id));
    if (!row) return mockErrors.notFound();
    if (!isMine(row) && !hasRole("PRIVACY") && !hasRole("SECURITY_ADMIN"))
      return mockErrors.forbidden();
    return HttpResponse.json({ ...summary(row), ...row });
  }),

  http.post("/api/ops/raw-access-requests/:id/approve", ({ params }) => {
    const rejected = requireMockOps(["PRIVACY"]);
    if (rejected) return rejected;
    const row = find(String(params.id));
    if (!row) return mockErrors.notFound();
    if (selfApproval(row)) {
      return errorResponse(403, "SELF_APPROVAL_FORBIDDEN", "본인 요청은 승인할 수 없습니다.");
    }
    if (row.status !== "PENDING") {
      return errorResponse(409, "INVALID_TRANSITION", "현재 상태에서 허용되지 않는 전이입니다.");
    }
    row.status = "APPROVED";
    row.approvedByName = getMockOperator()?.name ?? null;
    row.approvedAt = new Date().toISOString();
    row.expiresAt = at(24 * HOUR);
    return HttpResponse.json({
      requestId: row.requestId,
      requestType: row.requestType,
      status: row.status,
      approvedAt: row.approvedAt,
      expiresAt: row.expiresAt,
    });
  }),

  http.post("/api/ops/raw-access-requests/:id/reject", async ({ params, request: req }) => {
    const rejected = requireMockOps(["PRIVACY"]);
    if (rejected) return rejected;
    const row = find(String(params.id));
    if (!row) return mockErrors.notFound();
    const reason = reasonOf(await readBody(req));
    if (reason === null)
      return mockErrors.validation([{ field: "reason", message: "사유를 입력해 주세요." }]);
    if (selfApproval(row)) {
      return errorResponse(403, "SELF_APPROVAL_FORBIDDEN", "본인 요청은 거절할 수 없습니다.");
    }
    if (row.status !== "PENDING") {
      return errorResponse(409, "INVALID_TRANSITION", "현재 상태에서 허용되지 않는 전이입니다.");
    }
    row.status = "REJECTED";
    row.rejectedByName = getMockOperator()?.name ?? null;
    row.rejectedAt = new Date().toISOString();
    row.rejectReason = reason;
    return HttpResponse.json({
      requestId: row.requestId,
      status: "REJECTED",
      rejectedAt: row.rejectedAt,
    });
  }),

  http.post("/api/ops/raw-access-requests/:id/execute", ({ params }) => {
    const rejected = requireMockOps();
    if (rejected) return rejected;
    const row = find(String(params.id));
    if (!row) return mockErrors.notFound();
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    if ((row.beneficiaryOperatorId ?? row.requestedByOperatorId) !== me())
      return mockErrors.forbidden();
    if (
      row.status === "INVALIDATED" ||
      (row.status === "APPROVED" && !row.grant && Date.parse(row.expiresAt ?? "") <= Date.now())
    ) {
      row.status = "INVALIDATED";
      return errorResponse(409, "APPROVAL_INVALIDATED", "승인이 무효가 되었습니다.");
    }
    if (row.status !== "APPROVED" || row.grant) {
      return errorResponse(409, "INVALID_TRANSITION", "현재 상태에서 허용되지 않는 전이입니다.");
    }
    const isDownload = row.requestType === "RAW_DOWNLOAD";
    row.grant = grant(state.nextGrantId++, {
      executedAt: new Date().toISOString(),
      expiresAt: at(60 * MINUTE),
      ...(isDownload ? file : {}),
    });
    return HttpResponse.json({
      grantId: row.grant.grantId,
      approvalRequestId: row.requestId,
      requestType: row.requestType,
      executedAt: row.grant.executedAt,
      expiresAt: row.grant.expiresAt,
      fileSize: row.grant.fileSize,
      fileSha256: row.grant.fileSha256,
      downloadPath: isDownload ? `/api/ops/raw-access-grants/${row.grant.grantId}/file` : null,
    });
  }),

  http.post("/api/ops/raw-access-grants/:grantId/revoke", async ({ params, request: req }) => {
    const rejected = requireMockOps(["SECURITY_ADMIN"]);
    if (rejected) return rejected;
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    const row = state.requests.find(
      (entry) => String(entry.grant?.grantId) === String(params.grantId),
    );
    if (!row?.grant) return mockErrors.notFound();
    const reason = reasonOf(await readBody(req));
    if (reason === null)
      return mockErrors.validation([{ field: "reason", message: "사유를 입력해 주세요." }]);
    if (row.grant.revokedAt || Date.parse(row.grant.expiresAt) <= Date.now()) {
      return errorResponse(409, "INVALID_TRANSITION", "이미 만료되었거나 회수된 접근입니다.");
    }
    row.grant.revokedAt = new Date().toISOString();
    row.grant.revokedByName = getMockOperator()?.name ?? null;
    row.grant.revokeReason = reason;
    return HttpResponse.json({
      grantId: row.grant.grantId,
      revokedAt: row.grant.revokedAt,
      revokedByOperatorId: me(),
    });
  }),

  http.get("/api/ops/raw-access-grants/:grantId/content", ({ params }) => {
    const rejected = requireMockOps();
    if (rejected) return rejected;
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    const row = state.requests.find((item) => String(item.grant?.grantId) === params.grantId);
    if (!row || !row.grant) return mockErrors.notFound();
    if (row.requestType !== "RAW_VIEW") {
      return errorResponse(409, "INVALID_TRANSITION", "열람 승인 건이 아닙니다.");
    }
    if (row.grant.revokedAt) return errorResponse(409, "RAW_ACCESS_REVOKED", "회수된 접근입니다.");
    if (Date.parse(row.grant.expiresAt) <= Date.now()) {
      return errorResponse(409, "RAW_ACCESS_EXPIRED", "접근 시간이 지났습니다.");
    }
    return HttpResponse.json({
      grantId: row.grant.grantId,
      approvalRequestId: row.requestId,
      targetType: row.targetType,
      targetId: row.targetId ?? 0,
      expiresAt: row.grant.expiresAt,
      readAt: new Date().toISOString(),
      content: { 사무소명: "사무소 예시", 대표자: "김대표" },
    });
  }),

  http.get("/api/ops/raw-access-grants/:grantId/file", ({ params }) => {
    const rejected = requireMockOps();
    if (rejected) return rejected;
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    const row = state.requests.find(
      (entry) => String(entry.grant?.grantId) === String(params.grantId),
    );
    if (!row?.grant) return mockErrors.notFound();
    if ((row.beneficiaryOperatorId ?? row.requestedByOperatorId) !== me())
      return mockErrors.forbidden();
    if (row.requestType !== "RAW_DOWNLOAD") {
      return errorResponse(403, "DOWNLOAD_NOT_APPROVED", "다운로드 승인이 없습니다.");
    }
    if (row.grant.revokedAt) return errorResponse(409, "RAW_ACCESS_REVOKED", "회수된 접근입니다.");
    if (row.grant.downloadedAt)
      return errorResponse(409, "RAW_DOWNLOAD_ALREADY_USED", "이미 받은 파일입니다.");
    if (Date.parse(row.grant.expiresAt) <= Date.now())
      return errorResponse(409, "RAW_ACCESS_EXPIRED", "접근 시간이 만료되었습니다.");
    row.grant.downloadedAt = new Date().toISOString();
    return new HttpResponse("mock-export-bytes", {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment",
        "Cache-Control": "no-store",
        "X-Content-SHA256": row.grant.fileSha256 ?? "",
      },
    });
  }),
];
