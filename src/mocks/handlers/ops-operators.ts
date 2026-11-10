import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import { OPS_ROLES } from "@/features/ops/model/roles";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockOperator, requireMockOps, requireMockStepUp } from "./ops-session";

type MockOperatorRow = {
  operatorId: number;
  name: string;
  status: "ACTIVE" | "DISABLED";
  roles: string[];
  createdAt: string;
  sessions: number;
  approvals: number;
};

type MockInvitation = {
  invitationId: number;
  inviteeName: string;
  inviteeEmail: string;
  roles: string[];
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  invitedByOperatorId: number;
  invitedByName: string;
  acceptedOperatorId: number | null;
  acceptedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  version: number;
};

type MockAudit = {
  auditId: number;
  operatorAccountId: number;
  operatorName: string;
  actionType: string;
  targetType: string | null;
  targetId: number | null;
  detail: string | null;
  createdAt: string;
};

export const MOCK_AUDIT_ACTIONS = [
  "RAW_ACCESS_REQUESTED",
  "RAW_ACCESS_APPROVED",
  "RAW_ACCESS_REJECTED",
  "RAW_ACCESS_EXECUTED",
  "RAW_ACCESS_DOWNLOADED",
  "RAW_ACCESS_REVOKED",
  "OPERATOR_ROLE_GRANTED",
  "OPERATOR_ROLE_REVOKED",
  "OPERATOR_DISABLED",
  "OPERATOR_ENABLED",
  "OPERATOR_INVITATION_CREATED",
  "OPERATOR_INVITATION_CANCELLED",
];

const HOUR = 3_600_000;

function ago(hours: number): string {
  return new Date(Date.now() - hours * HOUR).toISOString();
}

function seedOperators(): MockOperatorRow[] {
  return [
    {
      operatorId: 1,
      name: "운영 김사이",
      status: "ACTIVE",
      roles: [...OPS_ROLES],
      createdAt: ago(900),
      sessions: 1,
      approvals: 0,
    },
    {
      operatorId: 2,
      name: "박지원",
      status: "ACTIVE",
      roles: ["PRIVACY"],
      createdAt: ago(800),
      sessions: 2,
      approvals: 3,
    },
    {
      operatorId: 3,
      name: "최보안",
      status: "ACTIVE",
      roles: ["SECURITY_ADMIN"],
      createdAt: ago(700),
      sessions: 0,
      approvals: 0,
    },
    {
      operatorId: 4,
      name: "이퇴사",
      status: "DISABLED",
      roles: ["OPS"],
      createdAt: ago(600),
      sessions: 0,
      approvals: 0,
    },
  ];
}

function invitation(id: number, patch: Partial<MockInvitation>): MockInvitation {
  return {
    invitationId: id,
    inviteeName: "이신규",
    inviteeEmail: `new${id}@sairo.example`,
    roles: ["REVIEW"],
    status: "PENDING",
    expiresAt: new Date(Date.now() + 60 * HOUR).toISOString(),
    invitedByOperatorId: 1,
    invitedByName: "운영 김사이",
    acceptedOperatorId: null,
    acceptedAt: null,
    cancelledAt: null,
    createdAt: ago(12),
    version: 1,
    ...patch,
  };
}

function seedInvitations(): MockInvitation[] {
  return [
    invitation(1, {}),
    invitation(2, {
      inviteeName: "정수락",
      status: "ACCEPTED",
      acceptedOperatorId: 9,
      acceptedAt: ago(5),
      version: 2,
    }),
    invitation(3, {
      inviteeName: "한만료",
      status: "PENDING",
      expiresAt: ago(3),
      createdAt: ago(80),
    }),
    invitation(4, { inviteeName: "오취소", status: "CANCELLED", cancelledAt: ago(4), version: 2 }),
  ];
}

function seedAudit(): MockAudit[] {
  const row = (
    id: number,
    hours: number,
    actor: number,
    name: string,
    action: string,
    targetType: string | null,
    targetId: number | null,
    detail: string | null,
  ): MockAudit => ({
    auditId: id,
    operatorAccountId: actor,
    operatorName: name,
    actionType: action,
    targetType,
    targetId,
    detail,
    createdAt: ago(hours),
  });
  return [
    row(1, 1, 1, "운영 김사이", "RAW_ACCESS_REQUESTED", "OFFICE", 42, "요청 2"),
    row(2, 2, 2, "박지원", "RAW_ACCESS_APPROVED", "OFFICE", 42, "요청 3"),
    row(3, 3, 1, "운영 김사이", "RAW_ACCESS_EXECUTED", "OFFICE", 42, "요청 3"),
    row(4, 4, 2, "박지원", "RAW_ACCESS_REJECTED", "MEMBER", 7, "요청 11"),
    row(5, 5, 1, "운영 김사이", "RAW_ACCESS_DOWNLOADED", "OFFICE", 42, "요청 7"),
    row(6, 30, 3, "최보안", "RAW_ACCESS_REVOKED", "OFFICE", 42, "요청 9"),
    row(7, 40, 3, "최보안", "OPERATOR_ROLE_GRANTED", null, null, "운영자 2"),
    row(8, 50, 3, "최보안", "OPERATOR_INVITATION_CREATED", null, null, null),
  ];
}

const state = {
  operators: seedOperators(),
  invitations: seedInvitations(),
  audit: seedAudit(),
  nextInvitationId: 10,
};

export function resetMockOperators(): void {
  state.operators = seedOperators();
  state.invitations = seedInvitations();
  state.audit = seedAudit();
  state.nextInvitationId = 10;
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

function publicOperator(row: MockOperatorRow) {
  return {
    operatorId: row.operatorId,
    name: row.name,
    status: row.status,
    roles: row.roles,
    createdAt: row.createdAt,
  };
}

function activeAdmins(excludeId?: number): MockOperatorRow[] {
  return state.operators.filter(
    (row) =>
      row.status === "ACTIVE" &&
      row.roles.includes("SECURITY_ADMIN") &&
      row.operatorId !== excludeId,
  );
}

function findOperator(id: string): MockOperatorRow | undefined {
  return state.operators.find((row) => String(row.operatorId) === id);
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null ? Object.fromEntries(Object.entries(body)) : {};
}

function effectiveInvitationStatus(row: MockInvitation): MockInvitation["status"] {
  return row.status === "PENDING" && Date.parse(row.expiresAt) <= Date.now()
    ? "EXPIRED"
    : row.status;
}

const ADMIN = ["SECURITY_ADMIN"] as const;

export const opsOperatorHandlers: RequestHandler[] = [
  http.get("/api/ops/operators", ({ request }) => {
    const rejected = requireMockOps(ADMIN);
    if (rejected) return rejected;
    return HttpResponse.json(pageOf(state.operators.map(publicOperator), new URL(request.url)));
  }),

  http.post("/api/ops/operators/:id/roles", async ({ params, request }) => {
    const rejected = requireMockOps(ADMIN);
    if (rejected) return rejected;
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    const row = findOperator(String(params.id));
    if (!row) return mockErrors.notFound();
    const body = await readBody(request);
    const roles = Array.isArray(body.roles) ? body.roles.map(String) : [];
    if (roles.length === 0 || roles.some((role) => !OPS_ROLES.some((known) => known === role))) {
      return mockErrors.validation([{ field: "roles", message: "역할을 확인해 주세요." }]);
    }
    if (
      row.status === "ACTIVE" &&
      row.roles.includes("SECURITY_ADMIN") &&
      !roles.includes("SECURITY_ADMIN") &&
      activeAdmins(row.operatorId).length === 0
    ) {
      return errorResponse(409, "LAST_SECURITY_ADMIN", "마지막 활성 보안관리자입니다.");
    }
    row.roles = roles;
    return HttpResponse.json(publicOperator(row));
  }),

  http.post("/api/ops/operators/:id/disable", async ({ params, request }) => {
    const rejected = requireMockOps(ADMIN);
    if (rejected) return rejected;
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    const row = findOperator(String(params.id));
    if (!row) return mockErrors.notFound();
    const body = await readBody(request);
    if (typeof body.reason !== "string" || body.reason.trim() === "") {
      return mockErrors.validation([{ field: "reason", message: "사유를 입력해 주세요." }]);
    }
    if (row.operatorId === getMockOperator()?.operatorId) return mockErrors.forbidden();
    if (row.status === "DISABLED") {
      return errorResponse(409, "INVALID_TRANSITION", "이미 비활성인 계정입니다.");
    }
    if (row.roles.includes("SECURITY_ADMIN") && activeAdmins(row.operatorId).length === 0) {
      return errorResponse(409, "LAST_SECURITY_ADMIN", "마지막 활성 보안관리자입니다.");
    }
    row.status = "DISABLED";
    const result = {
      operatorId: row.operatorId,
      status: "DISABLED",
      terminatedSessionCount: row.sessions,
      invalidatedApprovalCount: row.approvals,
    };
    row.sessions = 0;
    row.approvals = 0;
    return HttpResponse.json(result);
  }),

  http.post("/api/ops/operators/:id/enable", ({ params }) => {
    const rejected = requireMockOps(ADMIN);
    if (rejected) return rejected;
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    const row = findOperator(String(params.id));
    if (!row) return mockErrors.notFound();
    if (row.status === "ACTIVE") {
      return errorResponse(409, "INVALID_TRANSITION", "이미 활성인 계정입니다.");
    }
    row.status = "ACTIVE";
    return HttpResponse.json({ operatorId: row.operatorId, status: "ACTIVE" });
  }),

  http.get("/api/ops/operator-invitations", ({ request }) => {
    const rejected = requireMockOps(ADMIN);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const rows = state.invitations
      .map((row) => ({ ...row, status: effectiveInvitationStatus(row) }))
      .filter((row) => (status ? row.status === status : true))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return HttpResponse.json(pageOf(rows, url));
  }),

  http.post("/api/ops/operator-invitations", async ({ request }) => {
    const rejected = requireMockOps(ADMIN);
    if (rejected) return rejected;
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    const body = await readBody(request);
    const name = typeof body.inviteeName === "string" ? body.inviteeName.trim() : "";
    const email = typeof body.inviteeEmail === "string" ? body.inviteeEmail.trim() : "";
    const roles = Array.isArray(body.roles) ? body.roles.map(String) : [];
    const errors: { field: string; message: string }[] = [];
    if (name === "") errors.push({ field: "inviteeName", message: "이름을 입력해 주세요." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push({ field: "inviteeEmail", message: "이메일 형식을 확인해 주세요." });
    if (roles.length === 0 || roles.some((role) => !OPS_ROLES.some((known) => known === role))) {
      errors.push({ field: "roles", message: "역할을 확인해 주세요." });
    }
    if (errors.length > 0) return mockErrors.validation(errors);
    const pending = state.invitations.some(
      (row) =>
        row.inviteeEmail.toLowerCase() === email.toLowerCase() &&
        effectiveInvitationStatus(row) === "PENDING",
    );
    if (pending) {
      return errorResponse(409, "INVITATION_ALREADY_PENDING", "대기 중인 초대가 있습니다.");
    }
    const operator = getMockOperator();
    const row = invitation(state.nextInvitationId++, {
      inviteeName: name,
      inviteeEmail: email,
      roles,
      expiresAt: new Date(Date.now() + 72 * HOUR).toISOString(),
      invitedByOperatorId: operator?.operatorId ?? 0,
      invitedByName: operator?.name ?? "",
      createdAt: new Date().toISOString(),
    });
    state.invitations.push(row);
    const stamp = row.createdAt;
    return HttpResponse.json(
      {
        invitationId: row.invitationId,
        inviteeName: row.inviteeName,
        inviteeEmail: row.inviteeEmail,
        roles: row.roles,
        status: "PENDING",
        expiresAt: row.expiresAt,
        createdAt: stamp,
        updatedAt: stamp,
        version: row.version,
      },
      { status: 201 },
    );
  }),

  http.post("/api/ops/operator-invitations/:id/cancel", ({ params, request }) => {
    const rejected = requireMockOps(ADMIN);
    if (rejected) return rejected;
    const stepUp = requireMockStepUp();
    if (stepUp) return stepUp;
    const row = state.invitations.find((entry) => String(entry.invitationId) === String(params.id));
    if (!row) return mockErrors.notFound();
    const version = Number(request.headers.get("If-Match"));
    if (version !== row.version) return mockErrors.versionConflict(row.version);
    if (effectiveInvitationStatus(row) !== "PENDING") {
      return errorResponse(409, "INVALID_TRANSITION", "대기 중인 초대만 취소할 수 있습니다.");
    }
    row.status = "CANCELLED";
    row.cancelledAt = new Date().toISOString();
    row.version += 1;
    return HttpResponse.json({
      invitationId: row.invitationId,
      status: "CANCELLED",
      cancelledAt: row.cancelledAt,
      updatedAt: row.cancelledAt,
      version: row.version,
    });
  }),

  http.get("/api/ops/audit-log", ({ request }) => {
    const rejected = requireMockOps(ADMIN);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const query = url.searchParams;
    const action = query.get("actionType");
    if (action && !MOCK_AUDIT_ACTIONS.includes(action)) {
      return mockErrors.validation([
        { field: "actionType", message: "허용되지 않는 행위 종류입니다." },
      ]);
    }
    const from = query.get("from") ? Date.parse(query.get("from") ?? "") : null;
    const to = query.get("to") ? Date.parse(query.get("to") ?? "") : null;
    const rows = state.audit
      .filter((row) => (action ? row.actionType === action : true))
      .filter((row) =>
        query.get("operatorId") ? String(row.operatorAccountId) === query.get("operatorId") : true,
      )
      .filter((row) =>
        query.get("targetType") ? row.targetType === query.get("targetType") : true,
      )
      .filter((row) =>
        query.get("targetId") ? String(row.targetId) === query.get("targetId") : true,
      )
      .filter((row) => (from !== null ? Date.parse(row.createdAt) >= from : true))
      .filter((row) => (to !== null ? Date.parse(row.createdAt) < to : true))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return HttpResponse.json(pageOf(rows, url));
  }),
];
