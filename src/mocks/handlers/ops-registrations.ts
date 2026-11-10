import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import { errorResponse, mockErrors } from "../error-responses";
import { requireMockOps } from "./ops-session";

const CHECKLIST_CODES = [
  "REVISION_MATCH",
  "SOURCE_VERIFIED",
  "REGISTRATION_RELATION",
  "QUALIFICATION_EDUCATION",
  "EMPLOYMENT_ROSTER",
] as const;

type MockChecklist = {
  itemCode: string;
  checked: boolean;
  checkedByOperatorName?: string;
  checkedAt?: string;
};

type MockRegistration = {
  registrationId: number;
  requestedOfficeName: string;
  businessRegistrationNumber: string;
  status: string;
  createdAt: string;
  hasEvidence: boolean;
  officeId: number | null;
  evidenceTypes: string[];
  checklist: MockChecklist[];
  rejectionReason: string | null;
  history: {
    historyId: number;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    createdAt: string;
  }[];
};

type MockChange = {
  requestId: number;
  officeId: number;
  requestedByMembershipId: number;
  changeType: "ADDRESS" | "REGISTRATION_INFO" | "REPRESENTATIVE";
  requestedValues: Record<string, string>;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

function emptyChecklist(): MockChecklist[] {
  return CHECKLIST_CODES.map((itemCode) => ({ itemCode, checked: false }));
}

function seedRegistrations(): MockRegistration[] {
  const now = Date.now();
  const hoursAgo = (hours: number) => new Date(now - hours * 3_600_000).toISOString();
  const allChecked = () =>
    CHECKLIST_CODES.map((itemCode) => ({
      itemCode,
      checked: true,
      checkedByOperatorName: "운영 김사이",
      checkedAt: hoursAgo(1),
    }));
  return [
    {
      registrationId: 101,
      requestedOfficeName: "한강공인중개사사무소",
      businessRegistrationNumber: "1234567890",
      status: "PENDING_REVIEW",
      createdAt: hoursAgo(100),
      hasEvidence: true,
      officeId: null,
      evidenceTypes: ["BROKERAGE_LICENSE", "BUSINESS_CERTIFICATE", "REPRESENTATIVE_QUALIFICATION"],
      checklist: emptyChecklist(),
      rejectionReason: null,
      history: [
        {
          historyId: 1,
          fromStatus: "DRAFT",
          toStatus: "PENDING_REVIEW",
          reason: null,
          createdAt: hoursAgo(100),
        },
      ],
    },
    {
      registrationId: 102,
      requestedOfficeName: "북악부동산",
      businessRegistrationNumber: "2234567890",
      status: "PENDING_REVIEW",
      createdAt: hoursAgo(5),
      hasEvidence: true,
      officeId: null,
      evidenceTypes: ["BROKERAGE_LICENSE", "BUSINESS_CERTIFICATE"],
      checklist: allChecked(),
      rejectionReason: null,
      history: [
        {
          historyId: 2,
          fromStatus: "DRAFT",
          toStatus: "PENDING_REVIEW",
          reason: null,
          createdAt: hoursAgo(5),
        },
      ],
    },
    {
      registrationId: 103,
      requestedOfficeName: "남산공인중개사",
      businessRegistrationNumber: "3234567890",
      status: "SUPPLEMENT_REQUESTED",
      createdAt: hoursAgo(200),
      hasEvidence: true,
      officeId: null,
      evidenceTypes: ["BROKERAGE_LICENSE"],
      checklist: emptyChecklist(),
      rejectionReason: null,
      history: [
        {
          historyId: 3,
          fromStatus: "PENDING_REVIEW",
          toStatus: "SUPPLEMENT_REQUESTED",
          reason: "서류 재제출",
          createdAt: hoursAgo(150),
        },
      ],
    },
    {
      registrationId: 104,
      requestedOfficeName: "청계공인중개사",
      businessRegistrationNumber: "4234567890",
      status: "APPROVED",
      createdAt: hoursAgo(400),
      hasEvidence: true,
      officeId: 7,
      evidenceTypes: ["BROKERAGE_LICENSE"],
      checklist: allChecked(),
      rejectionReason: null,
      history: [
        {
          historyId: 4,
          fromStatus: "PENDING_REVIEW",
          toStatus: "APPROVED",
          reason: null,
          createdAt: hoursAgo(300),
        },
      ],
    },
    {
      registrationId: 105,
      requestedOfficeName: "서촌부동산",
      businessRegistrationNumber: "5234567890",
      status: "REJECTED",
      createdAt: hoursAgo(500),
      hasEvidence: false,
      officeId: null,
      evidenceTypes: [],
      checklist: emptyChecklist(),
      rejectionReason: "서류가 확인되지 않습니다.",
      history: [
        {
          historyId: 5,
          fromStatus: "PENDING_REVIEW",
          toStatus: "REJECTED",
          reason: "서류가 확인되지 않습니다.",
          createdAt: hoursAgo(450),
        },
      ],
    },
  ];
}

function seedChanges(): MockChange[] {
  const created = new Date(Date.now() - 3_600_000).toISOString();
  return [
    {
      requestId: 301,
      officeId: 7,
      requestedByMembershipId: 11,
      changeType: "ADDRESS",
      requestedValues: { address: "서울특별시 종로구 새주소 1" },
      status: "PENDING_REVIEW",
      reviewedAt: null,
      rejectionReason: null,
      createdAt: created,
    },
    {
      requestId: 302,
      officeId: 8,
      requestedByMembershipId: 12,
      changeType: "REPRESENTATIVE",
      requestedValues: { representativeName: "이대표" },
      status: "PENDING_REVIEW",
      reviewedAt: null,
      rejectionReason: null,
      createdAt: created,
    },
    {
      requestId: 303,
      officeId: 9,
      requestedByMembershipId: 13,
      changeType: "REGISTRATION_INFO",
      requestedValues: { realEstateLicenseNumber: "11680-2024-00099" },
      status: "APPROVED",
      reviewedAt: created,
      rejectionReason: null,
      createdAt: created,
    },
  ];
}

const state = { registrations: seedRegistrations(), changes: seedChanges(), nextOfficeId: 20 };

export function resetMockRegistrations(): void {
  state.registrations = seedRegistrations();
  state.changes = seedChanges();
  state.nextOfficeId = 20;
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

function canApprove(row: MockRegistration): boolean {
  return row.checklist.every((item) => item.checked);
}

function detailOf(row: MockRegistration) {
  return {
    registrationId: row.registrationId,
    applicantUserId: 42,
    businessRegistrationNumber: row.businessRegistrationNumber,
    realEstateLicenseNumber: "11680-2024-00012",
    requestedOfficeName: row.requestedOfficeName,
    requestedRepresentativeName: "김대표",
    requestedRepresentativePhone: "02-123-4567",
    requestedAddress: "서울시 종로구",
    status: row.status,
    hasEvidence: row.hasEvidence,
    entityType: "INDIVIDUAL",
    registrationAuthority: "서울특별시 종로구청",
    applicantRegistrationRelation: "REPRESENTATIVE",
    currentRevisionNo: 1,
    officeId: row.officeId,
    revisions: [
      {
        revisionNo: 1,
        submittedAt: row.createdAt,
        requestedOfficeName: row.requestedOfficeName,
        requestedAddress: "서울시 종로구",
        evidenceTypes: row.evidenceTypes,
      },
    ],
    reviewChecklist: row.checklist,
    canApprove: canApprove(row),
    rejectionReason: row.rejectionReason,
    statusHistory: row.history.map((entry) => ({
      ...entry,
      changedByType: "OPERATOR",
      changedByOperatorId: null,
    })),
  };
}

function summaryOf(row: MockRegistration) {
  return {
    registrationId: row.registrationId,
    requestedOfficeName: row.requestedOfficeName,
    businessRegistrationNumber: row.businessRegistrationNumber,
    status: row.status,
    createdAt: row.createdAt,
  };
}

function transitionBody(row: MockRegistration) {
  const stamp = new Date().toISOString();
  return {
    registrationId: row.registrationId,
    status: row.status,
    officeId: row.officeId,
    currentRevisionNo: 1,
    createdAt: row.createdAt,
    updatedAt: stamp,
    version: 2,
  };
}

function transition(row: MockRegistration, to: string, reason: string | null) {
  row.history.push({
    historyId: row.history.length + 100,
    fromStatus: row.status,
    toStatus: to,
    reason,
    createdAt: new Date().toISOString(),
  });
  row.status = to;
}

function find(id: string): MockRegistration | undefined {
  return state.registrations.find((row) => String(row.registrationId) === id);
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null ? Object.fromEntries(Object.entries(body)) : {};
}

function reasonOf(body: Record<string, unknown>): string | null {
  return typeof body.reason === "string" && body.reason.trim() !== "" ? body.reason.trim() : null;
}

const REVIEW = ["REVIEW"] as const;

export const opsRegistrationHandlers: RequestHandler[] = [
  http.get("/api/ops/office-registrations", ({ request }) => {
    const rejected = requireMockOps(REVIEW);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "PENDING_REVIEW";
    const rows = state.registrations
      .filter((row) => row.status === status)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    return HttpResponse.json(pageOf(rows.map(summaryOf), url));
  }),

  http.get("/api/ops/office-registrations/:id", ({ params }) => {
    const rejected = requireMockOps(REVIEW);
    if (rejected) return rejected;
    const row = find(String(params.id));
    return row ? HttpResponse.json(detailOf(row)) : mockErrors.notFound();
  }),

  http.put("/api/ops/office-registrations/:id/checklist", async ({ params, request }) => {
    const rejected = requireMockOps(REVIEW);
    if (rejected) return rejected;
    const row = find(String(params.id));
    if (!row) return mockErrors.notFound();
    const body = await readBody(request);
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return mockErrors.validation([{ field: "items", message: "항목을 보내 주세요." }]);
    }
    if (row.status !== "PENDING_REVIEW") {
      return errorResponse(
        409,
        "INVALID_TRANSITION",
        "지금 상태에서는 확인 상태를 저장할 수 없습니다.",
      );
    }
    for (const item of items) {
      const entry = row.checklist.find((candidate) => candidate.itemCode === item?.itemCode);
      if (entry && typeof item.checked === "boolean") {
        entry.checked = item.checked;
        entry.checkedByOperatorName = item.checked ? "운영 김사이" : undefined;
        entry.checkedAt = item.checked ? new Date().toISOString() : undefined;
      }
    }
    return HttpResponse.json({
      registrationId: row.registrationId,
      revisionNo: 1,
      reviewChecklist: row.checklist,
      canApprove: canApprove(row),
    });
  }),

  http.post("/api/ops/office-registrations/:id/approve", ({ params }) => {
    const rejected = requireMockOps(REVIEW);
    if (rejected) return rejected;
    const row = find(String(params.id));
    if (!row) return mockErrors.notFound();
    if (!canApprove(row)) {
      return errorResponse(
        403,
        "REVIEW_CHECKLIST_INCOMPLETE",
        "필수 확인 항목이 완료되지 않았습니다.",
      );
    }
    if (row.status !== "PENDING_REVIEW") {
      return errorResponse(409, "INVALID_TRANSITION", "현재 상태에서 허용되지 않는 전이입니다.");
    }
    row.officeId = state.nextOfficeId++;
    transition(row, "APPROVED", null);
    return HttpResponse.json(transitionBody(row));
  }),

  http.post("/api/ops/office-registrations/:id/request-supplement", async ({ params, request }) => {
    const rejected = requireMockOps(REVIEW);
    if (rejected) return rejected;
    const row = find(String(params.id));
    if (!row) return mockErrors.notFound();
    const body = await readBody(request);
    const reason = reasonOf(body);
    const due = typeof body.supplementDueAt === "string" ? Date.parse(body.supplementDueAt) : NaN;
    if (reason === null)
      return mockErrors.validation([{ field: "reason", message: "사유를 입력해 주세요." }]);
    if (!Number.isFinite(due) || due <= Date.now()) {
      return mockErrors.validation([
        { field: "supplementDueAt", message: "보완 기한은 지금 이후여야 합니다." },
      ]);
    }
    if (row.status !== "PENDING_REVIEW") {
      return errorResponse(409, "INVALID_TRANSITION", "현재 상태에서 허용되지 않는 전이입니다.");
    }
    transition(row, "SUPPLEMENT_REQUESTED", reason);
    return HttpResponse.json(transitionBody(row));
  }),

  http.post("/api/ops/office-registrations/:id/reject", async ({ params, request }) => {
    const rejected = requireMockOps(REVIEW);
    if (rejected) return rejected;
    const row = find(String(params.id));
    if (!row) return mockErrors.notFound();
    const reason = reasonOf(await readBody(request));
    if (reason === null)
      return mockErrors.validation([{ field: "reason", message: "사유를 입력해 주세요." }]);
    if (row.status !== "PENDING_REVIEW" && row.status !== "SUPPLEMENT_REQUESTED") {
      return errorResponse(409, "INVALID_TRANSITION", "현재 상태에서 허용되지 않는 전이입니다.");
    }
    row.rejectionReason = reason;
    transition(row, "REJECTED", reason);
    return HttpResponse.json(transitionBody(row));
  }),

  http.post(
    "/api/ops/office-registrations/:id/evidence/download-url",
    async ({ params, request }) => {
      const rejected = requireMockOps(REVIEW);
      if (rejected) return rejected;
      const row = find(String(params.id));
      if (!row) return mockErrors.notFound();
      const body = await readBody(request);
      if (typeof body.evidenceType !== "string") {
        return mockErrors.validation([
          { field: "evidenceType", message: "증빙 종류를 보내 주세요." },
        ]);
      }
      if (row.status !== "PENDING_REVIEW" && row.status !== "SUPPLEMENT_REQUESTED") {
        return errorResponse(
          409,
          "INVALID_TRANSITION",
          "현재 상태에서는 증빙 서류를 받을 수 없습니다.",
        );
      }
      if (!row.hasEvidence || !row.evidenceTypes.includes(body.evidenceType)) {
        return errorResponse(404, "EVIDENCE_NOT_FOUND", "증빙 서류를 찾을 수 없습니다.");
      }
      return HttpResponse.json({
        downloadUrl: `https://files.example.test/evidence/${row.registrationId}/${body.evidenceType}`,
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      });
    },
  ),

  http.post("/api/ops/offices/:officeId/revoke", async ({ params, request }) => {
    const rejected = requireMockOps(REVIEW);
    if (rejected) return rejected;
    const row = state.registrations.find(
      (entry) => String(entry.officeId) === String(params.officeId),
    );
    if (!row) return mockErrors.notFound();
    const reason = reasonOf(await readBody(request));
    if (reason === null)
      return mockErrors.validation([{ field: "reason", message: "사유를 입력해 주세요." }]);
    if (row.status !== "APPROVED") {
      return errorResponse(409, "INVALID_TRANSITION", "인증이 완료된 사무소만 회수할 수 있습니다.");
    }
    transition(row, "REVOKED", reason);
    return HttpResponse.json({
      officeId: row.officeId,
      registrationId: row.registrationId,
      registrationStatus: "REVOKED",
    });
  }),

  http.get("/api/ops/office-change-requests", ({ request }) => {
    const rejected = requireMockOps(REVIEW);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "PENDING_REVIEW";
    const rows = state.changes
      .filter((row) => row.status === status)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    return HttpResponse.json(pageOf(rows, url));
  }),

  http.post("/api/ops/office-change-requests/:id/approve", ({ params }) => {
    const rejected = requireMockOps(REVIEW);
    if (rejected) return rejected;
    const row = state.changes.find((entry) => String(entry.requestId) === String(params.id));
    if (!row) return mockErrors.notFound();
    if (row.status !== "PENDING_REVIEW") {
      return errorResponse(409, "INVALID_TRANSITION", "이미 처리된 변경 신청입니다.");
    }
    row.status = "APPROVED";
    row.reviewedAt = new Date().toISOString();
    return HttpResponse.json({
      requestId: row.requestId,
      status: row.status,
      reviewedAt: row.reviewedAt,
      officeId: row.officeId,
      updatedAt: row.reviewedAt,
      version: 2,
    });
  }),

  http.post("/api/ops/office-change-requests/:id/reject", async ({ params, request }) => {
    const rejected = requireMockOps(REVIEW);
    if (rejected) return rejected;
    const row = state.changes.find((entry) => String(entry.requestId) === String(params.id));
    if (!row) return mockErrors.notFound();
    const reason = reasonOf(await readBody(request));
    if (reason === null)
      return mockErrors.validation([{ field: "reason", message: "사유를 입력해 주세요." }]);
    if (row.status !== "PENDING_REVIEW") {
      return errorResponse(409, "INVALID_TRANSITION", "이미 처리된 변경 신청입니다.");
    }
    row.status = "REJECTED";
    row.reviewedAt = new Date().toISOString();
    row.rejectionReason = reason;
    return HttpResponse.json({
      requestId: row.requestId,
      status: row.status,
      reviewedAt: row.reviewedAt,
      officeId: row.officeId,
      updatedAt: row.reviewedAt,
      version: 2,
    });
  }),
];
