import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockOperator, requireMockOps } from "./ops-session";

const SUPPORT = ["SUPPORT"] as const;
const PRIVACY = ["PRIVACY"] as const;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const OPERATOR_NAMES: Record<number, string> = { 1: "운영 김사이", 7: "김지원", 9: "이상담" };

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const dateOnly = (offsetMs: number) => iso(offsetMs).slice(0, 10);

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

function operatorId(): number {
  return getMockOperator()?.operatorId ?? 1;
}

function checkIfMatch(request: Request, version: number): Response | null {
  const header = request.headers.get("If-Match");
  if (header !== null && header !== String(version)) return mockErrors.versionConflict(version);
  return null;
}

/* 문의·티켓 */

type MockMessage = {
  messageId: number;
  visibility: "PUBLIC" | "INTERNAL";
  authorType: "REQUESTER" | "OPERATOR";
  authorDisplayName: string;
  content: string;
  createdAt: string;
};

type MockAttachment = {
  attachmentId: number;
  messageId: number | null;
  visibility: "PUBLIC" | "INTERNAL";
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  scanStatus: "PENDING" | "CLEAN" | "REJECTED";
  createdAt: string;
  byOperator: boolean;
};

type MockInquiry = {
  inquiryId: number;
  officeId: number | null;
  officeName: string | null;
  authorUserId: number;
  authorDisplayName: string;
  category: string;
  status: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  assignedOperatorId: number | null;
  assignedOperatorName: string | null;
  responseDueAt: string;
  answeredAt: string | null;
  closedAt: string | null;
  createdAt: string;
  content: string;
  requestScope: string | null;
  messages: MockMessage[];
  attachments: MockAttachment[];
  updatedAt: string;
  version: number;
};

function seedInquiries(): MockInquiry[] {
  const base = {
    authorUserId: 42,
    authorDisplayName: "홍*동",
    requestScope: null,
    closedAt: null,
    answeredAt: null,
    updatedAt: iso(-HOUR),
    version: 3,
  };
  return [
    {
      ...base,
      inquiryId: 501,
      officeId: 7,
      officeName: "한강공인중개사사무소",
      category: "BILLING",
      status: "OPEN",
      priority: "NORMAL",
      assignedOperatorId: null,
      assignedOperatorName: null,
      responseDueAt: iso(-2 * HOUR),
      createdAt: iso(-26 * HOUR),
      content: "결제가 두 번 된 것 같습니다.",
      messages: [],
      attachments: [
        {
          attachmentId: 1,
          messageId: null,
          visibility: "PUBLIC",
          fileName: "영수증.pdf",
          mediaType: "application/pdf",
          sizeBytes: 20480,
          scanStatus: "CLEAN",
          createdAt: iso(-26 * HOUR),
          byOperator: false,
        },
      ],
    },
    {
      ...base,
      inquiryId: 502,
      officeId: 8,
      officeName: "북악부동산",
      category: "AUTH",
      status: "ASSIGNED",
      priority: "HIGH",
      assignedOperatorId: 7,
      assignedOperatorName: "김지원",
      responseDueAt: iso(5 * HOUR),
      answeredAt: iso(-20 * HOUR),
      createdAt: iso(-48 * HOUR),
      content: "인증 서류를 다시 제출했는데 반영이 안 됩니다.",
      messages: [
        {
          messageId: 11,
          visibility: "PUBLIC",
          authorType: "OPERATOR",
          authorDisplayName: "김지원",
          content: "서류를 확인하고 있습니다.",
          createdAt: iso(-30 * HOUR),
        },
        {
          messageId: 12,
          visibility: "PUBLIC",
          authorType: "REQUESTER",
          authorDisplayName: "홍*동",
          content: "추가로 사업자등록증을 올렸습니다.",
          createdAt: iso(-24 * HOUR),
        },
        {
          messageId: 13,
          visibility: "INTERNAL",
          authorType: "OPERATOR",
          authorDisplayName: "김지원",
          content: "심사팀에 재확인을 요청했습니다.",
          createdAt: iso(-22 * HOUR),
        },
        {
          messageId: 14,
          visibility: "PUBLIC",
          authorType: "OPERATOR",
          authorDisplayName: "김지원",
          content: "재심사를 요청했고 내일 안내드리겠습니다.",
          createdAt: iso(-20 * HOUR),
        },
      ],
      attachments: [
        {
          attachmentId: 3,
          messageId: 13,
          visibility: "INTERNAL",
          fileName: "내부증빙.pdf",
          mediaType: "application/pdf",
          sizeBytes: 3 * 1024 * 1024,
          scanStatus: "CLEAN",
          createdAt: iso(-22 * HOUR),
          byOperator: true,
        },
        {
          attachmentId: 4,
          messageId: 14,
          visibility: "PUBLIC",
          fileName: "안내문.png",
          mediaType: "image/png",
          sizeBytes: 51200,
          scanStatus: "PENDING",
          createdAt: iso(-20 * HOUR),
          byOperator: true,
        },
      ],
    },
    {
      ...base,
      inquiryId: 503,
      officeId: null,
      officeName: null,
      category: "PRIVACY",
      status: "CLOSED",
      priority: "LOW",
      assignedOperatorId: 1,
      assignedOperatorName: "운영 김사이",
      responseDueAt: iso(-72 * HOUR),
      answeredAt: iso(-80 * HOUR),
      closedAt: iso(-70 * HOUR),
      createdAt: iso(-100 * HOUR),
      content: "개인정보 열람을 요청합니다.",
      messages: [
        {
          messageId: 21,
          visibility: "PUBLIC",
          authorType: "OPERATOR",
          authorDisplayName: "운영 김사이",
          content: "처리를 완료했습니다.",
          createdAt: iso(-80 * HOUR),
        },
      ],
      attachments: [],
    },
    {
      ...base,
      inquiryId: 504,
      officeId: 9,
      officeName: "남산공인중개사",
      category: "BUG",
      status: "WAITING_FOR_CUSTOMER",
      priority: "NORMAL",
      assignedOperatorId: 1,
      assignedOperatorName: "운영 김사이",
      responseDueAt: iso(10 * HOUR),
      answeredAt: iso(-5 * HOUR),
      createdAt: iso(-6 * HOUR),
      content: "화면이 멈춥니다.",
      messages: [],
      attachments: [1, 2, 3, 4, 5].map((n) => ({
        attachmentId: 40 + n,
        messageId: null,
        visibility: "INTERNAL" as const,
        fileName: `첨부${n}.pdf`,
        mediaType: "application/pdf",
        sizeBytes: 1024,
        scanStatus: "CLEAN" as const,
        createdAt: iso(-5 * HOUR),
        byOperator: true,
      })),
    },
  ];
}

type SupportState = {
  inquiries: MockInquiry[];
  nextMessageId: number;
  nextAttachmentId: number;
};

const supportState: SupportState = {
  inquiries: seedInquiries(),
  nextMessageId: 100,
  nextAttachmentId: 100,
};

function findInquiry(id: string | readonly string[] | undefined): MockInquiry | undefined {
  return supportState.inquiries.find((item) => String(item.inquiryId) === String(id));
}

function stamp(item: MockInquiry) {
  item.updatedAt = new Date().toISOString();
  item.version += 1;
}

function inquiryDetail(item: MockInquiry) {
  return {
    inquiryId: item.inquiryId,
    officeId: item.officeId,
    officeName: item.officeName,
    authorUserId: item.authorUserId,
    authorDisplayName: item.authorDisplayName,
    category: item.category,
    status: item.status,
    priority: item.priority,
    assignedOperatorId: item.assignedOperatorId,
    assignedOperatorName: item.assignedOperatorName,
    responseDueAt: item.responseDueAt,
    answeredAt: item.answeredAt,
    closedAt: item.closedAt,
    createdAt: item.createdAt,
    content: item.content,
    requestScope: item.requestScope,
    messages: item.messages,
    attachments: item.attachments.map((attachment) => ({
      attachmentId: attachment.attachmentId,
      messageId: attachment.messageId,
      visibility: attachment.visibility,
      fileName: attachment.fileName,
      mediaType: attachment.mediaType,
      sizeBytes: attachment.sizeBytes,
      scanStatus: attachment.scanStatus,
      createdAt: attachment.createdAt,
    })),
    updatedAt: item.updatedAt,
    version: item.version,
  };
}

function inquirySummary(item: MockInquiry) {
  const { content, requestScope, messages, attachments, ...rest } = item;
  void content;
  void requestScope;
  void messages;
  void attachments;
  return rest;
}

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_BYTES = 20 * 1024 * 1024;

const inquiryHandlers: RequestHandler[] = [
  http.get("/api/ops/support-inquiries", ({ request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const q = url.searchParams;
    const rows = supportState.inquiries
      .filter((item) => !q.get("category") || item.category === q.get("category"))
      .filter((item) => !q.get("status") || item.status === q.get("status"))
      .filter((item) => !q.get("priority") || item.priority === q.get("priority"))
      .filter(
        (item) =>
          !q.get("assignedOperatorId") ||
          String(item.assignedOperatorId) === q.get("assignedOperatorId"),
      )
      .filter((item) => !q.get("officeId") || String(item.officeId) === q.get("officeId"))
      .filter((item) => q.get("unassigned") !== "true" || item.assignedOperatorId === null)
      .filter(
        (item) =>
          q.get("overdue") !== "true" ||
          (item.answeredAt === null &&
            item.status !== "CLOSED" &&
            Date.parse(item.responseDueAt) < Date.now()),
      )
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    return HttpResponse.json(pageOf(rows.map(inquirySummary), url));
  }),

  http.get("/api/ops/support-inquiries/:inquiryId", ({ params }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const item = findInquiry(params.inquiryId);
    if (!item) return mockErrors.notFound();
    return HttpResponse.json(inquiryDetail(item));
  }),

  http.post("/api/ops/support-inquiries/:inquiryId/assign", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const item = findInquiry(params.inquiryId);
    if (!item) return mockErrors.notFound();
    const body = await readBody(request);
    const id = Number(body.assigneeOperatorId);
    if (!Number.isInteger(id) || id <= 0) {
      return mockErrors.validation([{ field: "assigneeOperatorId", message: "필수 항목입니다." }]);
    }
    const name = OPERATOR_NAMES[id];
    if (!name) {
      return errorResponse(409, "ASSIGNEE_NOT_ELIGIBLE", "활성 지원 담당 운영자가 아닙니다.");
    }
    item.assignedOperatorId = id;
    item.assignedOperatorName = name;
    if (item.status === "OPEN") item.status = "ASSIGNED";
    stamp(item);
    return HttpResponse.json({
      inquiryId: item.inquiryId,
      status: item.status,
      assigneeOperatorId: id,
      officeId: item.officeId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      version: item.version,
    });
  }),

  http.post("/api/ops/support-inquiries/:inquiryId/answer", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const item = findInquiry(params.inquiryId);
    if (!item) return mockErrors.notFound();
    const body = await readBody(request);
    const content = text(body.content);
    if (content === "") {
      return mockErrors.validation([{ field: "content", message: "내용을 입력해 주세요." }]);
    }
    if (body.needsCustomerReply === true && body.closeAfterReply === true) {
      return mockErrors.validation([
        { field: "closeAfterReply", message: "동시에 선택할 수 없습니다." },
      ]);
    }
    if (item.status === "CLOSED") {
      return errorResponse(409, "INVALID_TRANSITION", "종료된 문의에는 답변할 수 없습니다.");
    }
    const createdAt = new Date().toISOString();
    supportState.nextMessageId += 1;
    item.messages.push({
      messageId: supportState.nextMessageId,
      visibility: "PUBLIC",
      authorType: "OPERATOR",
      authorDisplayName: getMockOperator()?.name ?? "운영자",
      content,
      createdAt,
    });
    item.answeredAt = createdAt;
    if (body.closeAfterReply === true) {
      item.status = "CLOSED";
      item.closedAt = createdAt;
    } else {
      item.status = body.needsCustomerReply === true ? "WAITING_FOR_CUSTOMER" : "ANSWERED";
    }
    stamp(item);
    return HttpResponse.json({
      inquiryId: item.inquiryId,
      status: item.status,
      category: item.category,
      priority: item.priority,
      responseDueAt: item.responseDueAt,
      answeredAt: item.answeredAt,
      closedAt: item.closedAt,
      createdAt: item.createdAt,
      messages: item.messages
        .filter((message) => message.visibility === "PUBLIC")
        .map(({ messageId, visibility, content: c, createdAt: at }) => ({
          messageId,
          visibility,
          content: c,
          createdAt: at,
        })),
      attachments: [],
      officeId: item.officeId,
      updatedAt: item.updatedAt,
      version: item.version,
    });
  }),

  http.post("/api/ops/support-inquiries/:inquiryId/notes", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const item = findInquiry(params.inquiryId);
    if (!item) return mockErrors.notFound();
    const body = await readBody(request);
    const content = text(body.content);
    if (content === "") {
      return mockErrors.validation([{ field: "content", message: "내용을 입력해 주세요." }]);
    }
    if (item.status === "CLOSED") {
      return errorResponse(409, "INVALID_TRANSITION", "종료된 문의에는 메모를 추가할 수 없습니다.");
    }
    supportState.nextMessageId += 1;
    const message: MockMessage = {
      messageId: supportState.nextMessageId,
      visibility: "INTERNAL",
      authorType: "OPERATOR",
      authorDisplayName: getMockOperator()?.name ?? "운영자",
      content,
      createdAt: new Date().toISOString(),
    };
    item.messages.push(message);
    stamp(item);
    return HttpResponse.json(
      {
        messageId: message.messageId,
        inquiryId: item.inquiryId,
        visibility: "INTERNAL",
        content,
        createdAt: message.createdAt,
        officeId: item.officeId,
        updatedAt: item.updatedAt,
        version: item.version,
      },
      { status: 201 },
    );
  }),

  http.patch("/api/ops/support-inquiries/:inquiryId/priority", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const item = findInquiry(params.inquiryId);
    if (!item) return mockErrors.notFound();
    const conflict = checkIfMatch(request, item.version);
    if (conflict) return conflict;
    const body = await readBody(request);
    if (!["LOW", "NORMAL", "HIGH"].includes(text(body.priority))) {
      return mockErrors.validation([{ field: "priority", message: "허용되지 않는 값입니다." }]);
    }
    if (item.status === "CLOSED") {
      return errorResponse(409, "INVALID_TRANSITION", "종료된 문의는 바꿀 수 없습니다.");
    }
    item.priority = text(body.priority) as MockInquiry["priority"];
    stamp(item);
    return HttpResponse.json({
      inquiryId: item.inquiryId,
      priority: item.priority,
      responseDueAt: item.responseDueAt,
      updatedAt: item.updatedAt,
      version: item.version,
    });
  }),

  http.post("/api/ops/support-inquiries/:inquiryId/attachments", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const item = findInquiry(params.inquiryId);
    if (!item) return mockErrors.notFound();
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const headerName = request.headers.get("x-mock-file-name");
    const fileName =
      file && typeof file !== "string"
        ? file.name
        : headerName
          ? decodeURIComponent(headerName)
          : "첨부.pdf";
    const size = file && typeof file !== "string" ? file.size : 1024;
    if (!ALLOWED_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension))) {
      return mockErrors.validation([{ field: "file", message: "허용되지 않는 형식입니다." }]);
    }
    if (size > MAX_BYTES) {
      return mockErrors.validation([{ field: "file", message: "파일 용량이 20MB를 넘습니다." }]);
    }
    if (item.attachments.filter((attachment) => attachment.byOperator).length >= 5) {
      return mockErrors.validation([
        { field: "file", message: "운영자 첨부는 문의당 5개까지 올릴 수 있습니다." },
      ]);
    }
    supportState.nextAttachmentId += 1;
    const attachment: MockAttachment = {
      attachmentId: supportState.nextAttachmentId,
      messageId: null,
      visibility: "INTERNAL",
      fileName,
      mediaType: fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png",
      sizeBytes: size,
      scanStatus: "PENDING",
      createdAt: new Date().toISOString(),
      byOperator: true,
    };
    item.attachments.push(attachment);
    return HttpResponse.json(
      {
        attachmentId: attachment.attachmentId,
        inquiryId: item.inquiryId,
        messageId: null,
        scanStatus: "PENDING",
        fileName: attachment.fileName,
        mediaType: attachment.mediaType,
        sizeBytes: attachment.sizeBytes,
        createdAt: attachment.createdAt,
      },
      { status: 201 },
    );
  }),

  http.get("/api/ops/support-inquiries/:inquiryId/attachments/:attachmentId", ({ params }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const item = findInquiry(params.inquiryId);
    const attachment = item?.attachments.find(
      (entry) => String(entry.attachmentId) === String(params.attachmentId),
    );
    if (!attachment) return mockErrors.notFound();
    if (attachment.scanStatus !== "CLEAN") {
      return errorResponse(409, "INVALID_TRANSITION", "검사가 끝난 첨부만 내려받을 수 있습니다.");
    }
    return new HttpResponse("file", {
      status: 200,
      headers: { "Content-Type": attachment.mediaType },
    });
  }),
];

/* 기업 도입 견적 */

type MockQuote = {
  quoteId: number;
  versionNo: number;
  officeCount: number;
  seatCount: number;
  quoteAmount: number;
  taxAmount: number;
  serviceScope: string;
  deliveryDueAt: string;
  paymentMethod: string;
  refundTerms: string;
  issuedAt: string;
  issuedByOperatorName: string;
  expiresAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  supersededAt: string | null;
  billingInvoiceId: number | null;
};

type MockHistory = {
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  actorType: "OPERATOR" | "CUSTOMER" | "SYSTEM";
  actorOperatorName: string | null;
  assignedOperatorName: string | null;
  quoteId: number | null;
  reason: string | null;
  createdAt: string;
};

type MockLead = {
  leadId: number;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  branchCount: number;
  expectedSeats: number;
  migrationNeeded: boolean;
  content: string;
  status: string;
  assignedOperatorId: number | null;
  assignedOperatorName: string | null;
  contractReference: string | null;
  contractedAt: string | null;
  closedReason: string | null;
  closedNote: string | null;
  closedFromStatus: string | null;
  closedAt: string | null;
  quotes: MockQuote[];
  history: MockHistory[];
  createdAt: string;
  updatedAt: string;
  version: number;
};

function quoteOf(id: number, versionNo: number, patch: Partial<MockQuote> = {}): MockQuote {
  return {
    quoteId: id,
    versionNo,
    officeCount: 3,
    seatCount: 12,
    quoteAmount: 12_000_000,
    taxAmount: 1_200_000,
    serviceScope: "3개 지점 통합, 12석",
    deliveryDueAt: dateOnly(30 * DAY),
    paymentMethod: "계좌이체",
    refundTerms: "계약서 별도 조항",
    issuedAt: iso(-10 * DAY),
    issuedByOperatorName: "운영 김사이",
    expiresAt: iso(4 * DAY),
    acceptedAt: null,
    rejectedAt: null,
    supersededAt: null,
    billingInvoiceId: null,
    ...patch,
  };
}

function event(
  eventType: string,
  fromStatus: string | null,
  toStatus: string,
  patch: Partial<MockHistory> = {},
): MockHistory {
  return {
    eventType,
    fromStatus,
    toStatus,
    actorType: "OPERATOR",
    actorOperatorName: "운영 김사이",
    assignedOperatorName: null,
    quoteId: null,
    reason: null,
    createdAt: iso(-5 * DAY),
    ...patch,
  };
}

function seedLeads(): MockLead[] {
  const base = {
    contactName: "박담당",
    contactPhone: "010-1234-5678",
    contactEmail: "manager@example.com",
    migrationNeeded: true,
    content: "지점 세 곳을 한 번에 도입하고 싶습니다.",
    contractReference: null,
    contractedAt: null,
    closedReason: null,
    closedNote: null,
    closedFromStatus: null,
    closedAt: null,
    quotes: [] as MockQuote[],
    createdAt: iso(-12 * DAY),
    updatedAt: iso(-DAY),
    version: 2,
  };
  const me = { assignedOperatorId: 1, assignedOperatorName: "운영 김사이" };
  const nobody = { assignedOperatorId: null, assignedOperatorName: null };
  const other = { assignedOperatorId: 7, assignedOperatorName: "김지원" };
  return [
    {
      ...base,
      leadId: 601,
      companyName: "(주)샘플부동산",
      branchCount: 3,
      expectedSeats: 12,
      status: "RECEIVED",
      ...nobody,
      history: [
        event("RECEIVED", null, "RECEIVED", { actorType: "CUSTOMER", actorOperatorName: null }),
      ],
    },
    {
      ...base,
      leadId: 602,
      companyName: "한빛공인중개",
      branchCount: 2,
      expectedSeats: 6,
      status: "ASSIGNED",
      ...me,
      history: [
        event("RECEIVED", null, "RECEIVED", { actorType: "CUSTOMER", actorOperatorName: null }),
        event("ASSIGNED", "RECEIVED", "ASSIGNED", { assignedOperatorName: "운영 김사이" }),
      ],
    },
    {
      ...base,
      leadId: 603,
      companyName: "대한부동산그룹",
      branchCount: 5,
      expectedSeats: 30,
      status: "CONSULTING",
      ...other,
      history: [
        event("RECEIVED", null, "RECEIVED", { actorType: "CUSTOMER", actorOperatorName: null }),
        event("ASSIGNED", "RECEIVED", "ASSIGNED", { assignedOperatorName: "김지원" }),
        event("CONSULTATION_STARTED", "ASSIGNED", "CONSULTING", { actorOperatorName: "김지원" }),
      ],
    },
    {
      ...base,
      leadId: 604,
      companyName: "미래중개법인",
      branchCount: 3,
      expectedSeats: 12,
      status: "QUOTED",
      ...me,
      quotes: [
        quoteOf(1, 1, { supersededAt: iso(-3 * DAY), expiresAt: iso(-1 * DAY) }),
        quoteOf(2, 2, { quoteAmount: 11_000_000, taxAmount: 1_100_000 }),
      ],
      history: [
        event("RECEIVED", null, "RECEIVED", { actorType: "CUSTOMER", actorOperatorName: null }),
        event("QUOTE_ISSUED", "CONSULTING", "QUOTED", { quoteId: 1 }),
        event("QUOTE_ISSUED", "QUOTED", "QUOTED", { quoteId: 2 }),
      ],
    },
    {
      ...base,
      leadId: 605,
      companyName: "신세계공인",
      branchCount: 3,
      expectedSeats: 12,
      status: "ACCEPTED",
      ...me,
      quotes: [quoteOf(3, 1, { acceptedAt: iso(-DAY), billingInvoiceId: 9001 })],
      history: [
        event("RECEIVED", null, "RECEIVED", { actorType: "CUSTOMER", actorOperatorName: null }),
        event("QUOTE_ACCEPTED", "QUOTED", "ACCEPTED", {
          actorType: "CUSTOMER",
          actorOperatorName: null,
          quoteId: 3,
        }),
      ],
    },
    {
      ...base,
      leadId: 606,
      companyName: "종료된중개",
      branchCount: 1,
      expectedSeats: 2,
      status: "CLOSED",
      assignedOperatorId: null,
      assignedOperatorName: null,
      closedReason: "NO_RESPONSE",
      closedNote: "14일간 회신 없음",
      closedFromStatus: "CONSULTING",
      closedAt: iso(-2 * DAY),
      history: [
        event("RECEIVED", null, "RECEIVED", { actorType: "CUSTOMER", actorOperatorName: null }),
        event("CLOSED", "CONSULTING", "CLOSED", { reason: "NO_RESPONSE" }),
      ],
    },
    {
      ...base,
      leadId: 607,
      companyName: "계약완료중개",
      branchCount: 3,
      expectedSeats: 12,
      status: "CONTRACTED",
      ...me,
      contractReference: "C-2026-0042",
      contractedAt: iso(-DAY),
      quotes: [quoteOf(4, 1, { acceptedAt: iso(-3 * DAY), billingInvoiceId: 9002 })],
      history: [
        event("RECEIVED", null, "RECEIVED", { actorType: "CUSTOMER", actorOperatorName: null }),
        event("CONTRACTED", "ACCEPTED", "CONTRACTED", { reason: "C-2026-0042" }),
      ],
    },
    {
      ...base,
      leadId: 608,
      companyName: "견적후종료중개",
      branchCount: 3,
      expectedSeats: 12,
      status: "CLOSED",
      ...me,
      closedReason: "CUSTOMER_WITHDREW",
      closedNote: null,
      closedFromStatus: "QUOTED",
      closedAt: iso(-DAY),
      quotes: [quoteOf(5, 1, { supersededAt: null, expiresAt: iso(-DAY) })],
      history: [
        event("RECEIVED", null, "RECEIVED", { actorType: "CUSTOMER", actorOperatorName: null }),
        event("CLOSED", "QUOTED", "CLOSED", { reason: "CUSTOMER_WITHDREW" }),
      ],
    },
  ];
}

type LeadState = { leads: MockLead[]; nextQuoteId: number };
const leadState: LeadState = { leads: seedLeads(), nextQuoteId: 100 };

function findLead(id: string | readonly string[] | undefined): MockLead | undefined {
  return leadState.leads.find((item) => String(item.leadId) === String(id));
}

function allowedActions(lead: MockLead): string[] {
  const mine = lead.assignedOperatorId === operatorId();
  const mineOnly = (actions: string[]) => (mine ? actions : []);
  switch (lead.status) {
    case "RECEIVED":
      return ["ASSIGN", "CLOSE"];
    case "ASSIGNED":
      return ["ASSIGN", ...mineOnly(["START_CONSULTATION", "CLOSE"])];
    case "CONSULTING":
    case "QUOTED":
    case "REJECTED":
      return ["ASSIGN", ...mineOnly(["ISSUE_QUOTE", "CLOSE"])];
    case "ACCEPTED":
      return ["ASSIGN", ...mineOnly(["CONTRACT", "CLOSE"])];
    case "CLOSED":
      return ["REOPEN"];
    default:
      return [];
  }
}

function leadDetail(lead: MockLead) {
  return {
    ...lead,
    quotes: lead.quotes.map((quote) => ({
      ...quote,
      expired: quote.supersededAt === null && Date.parse(quote.expiresAt) < Date.now(),
    })),
    allowedActions: allowedActions(lead),
  };
}

function leadSummary(lead: MockLead) {
  const latest = lead.quotes.at(-1);
  return {
    leadId: lead.leadId,
    companyName: lead.companyName,
    status: lead.status,
    assignedOperatorId: lead.assignedOperatorId,
    assignedOperatorName: lead.assignedOperatorName,
    contactName: lead.contactName,
    branchCount: lead.branchCount,
    expectedSeats: lead.expectedSeats,
    migrationNeeded: lead.migrationNeeded,
    quoteAmount: latest?.quoteAmount ?? null,
    quoteExpiresAt: latest?.expiresAt ?? null,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    version: lead.version,
  };
}

function touch(lead: MockLead, to: string, entry: MockHistory) {
  lead.history.push(entry);
  lead.status = to;
  lead.updatedAt = new Date().toISOString();
  lead.version += 1;
}

/** 고객이 견적을 수락한 상태를 시험에서 만든다. 서버가 일회성 청구서를 만든 것으로 본다. */
export function acceptMockLeadQuote(leadId: number): void {
  const lead = findLead(String(leadId));
  const quote = lead?.quotes.at(-1);
  if (!lead || !quote) return;
  quote.acceptedAt = new Date().toISOString();
  quote.billingInvoiceId = 9100 + leadId;
  touch(
    lead,
    "ACCEPTED",
    event("QUOTE_ACCEPTED", lead.status, "ACCEPTED", {
      actorType: "CUSTOMER",
      actorOperatorName: null,
      quoteId: quote.quoteId,
    }),
  );
}

function guard(
  lead: MockLead | undefined,
  request: Request,
  action: string,
  needsOwner: boolean,
): Response | null {
  if (!lead) return mockErrors.notFound();
  const conflict = checkIfMatch(request, lead.version);
  if (conflict) return conflict;
  if (!allowedActions(lead).includes(action)) {
    const ownerOnly = needsOwner && lead.assignedOperatorId !== operatorId();
    const statusOk = !["CLOSED", "CONTRACTED"].includes(lead.status);
    if (ownerOnly && statusOk) return mockErrors.forbidden();
    return errorResponse(409, "INVALID_TRANSITION", "지금 상태에서는 할 수 없는 처리입니다.");
  }
  return null;
}

const leadHandlers: RequestHandler[] = [
  http.get("/api/ops/enterprise-leads", ({ request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const q = url.searchParams;
    const rows = leadState.leads
      .filter((lead) => !q.get("status") || lead.status === q.get("status"))
      .filter(
        (lead) =>
          !q.get("assignedOperatorId") ||
          String(lead.assignedOperatorId) === q.get("assignedOperatorId"),
      )
      .filter((lead) => q.get("unassigned") !== "true" || lead.assignedOperatorId === null);
    return HttpResponse.json(pageOf(rows.map(leadSummary), url));
  }),

  http.get("/api/ops/enterprise-leads/:leadId", ({ params }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const lead = findLead(params.leadId);
    if (!lead) return mockErrors.notFound();
    return HttpResponse.json(leadDetail(lead));
  }),

  http.post("/api/ops/enterprise-leads/:leadId/assign", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const lead = findLead(params.leadId);
    const blocked = guard(lead, request, "ASSIGN", false);
    if (blocked || !lead) return blocked ?? mockErrors.notFound();
    const body = await readBody(request);
    const id = Number(body.assignedOperatorId);
    if (!Number.isInteger(id) || id <= 0) {
      return mockErrors.validation([{ field: "assignedOperatorId", message: "필수 항목입니다." }]);
    }
    const name = OPERATOR_NAMES[id];
    if (!name) return errorResponse(409, "ASSIGNEE_NOT_ELIGIBLE", "활성 지원 운영자가 아닙니다.");
    const reassign = lead.assignedOperatorId !== null;
    lead.assignedOperatorId = id;
    lead.assignedOperatorName = name;
    touch(
      lead,
      lead.status === "RECEIVED" ? "ASSIGNED" : lead.status,
      event(
        reassign ? "REASSIGNED" : "ASSIGNED",
        lead.status,
        lead.status === "RECEIVED" ? "ASSIGNED" : lead.status,
        {
          assignedOperatorName: name,
        },
      ),
    );
    return HttpResponse.json({
      leadId: lead.leadId,
      status: lead.status,
      assignedOperatorId: id,
      assignedOperatorName: name,
      updatedAt: lead.updatedAt,
      version: lead.version,
    });
  }),

  http.post("/api/ops/enterprise-leads/:leadId/consultation-start", ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const lead = findLead(params.leadId);
    const blocked = guard(lead, request, "START_CONSULTATION", true);
    if (blocked || !lead) return blocked ?? mockErrors.notFound();
    touch(lead, "CONSULTING", event("CONSULTATION_STARTED", lead.status, "CONSULTING"));
    return HttpResponse.json({
      leadId: lead.leadId,
      status: lead.status,
      updatedAt: lead.updatedAt,
      version: lead.version,
    });
  }),

  http.post("/api/ops/enterprise-leads/:leadId/quote", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const lead = findLead(params.leadId);
    const blocked = guard(lead, request, "ISSUE_QUOTE", true);
    if (blocked || !lead) return blocked ?? mockErrors.notFound();
    const body = await readBody(request);
    const numberFields = ["officeCount", "seatCount", "quoteAmount", "taxAmount"] as const;
    const textFields = ["serviceScope", "deliveryDueAt", "paymentMethod", "refundTerms"] as const;
    const fieldErrors = [
      ...numberFields
        .filter((key) => typeof body[key] !== "number" || Number(body[key]) < 0)
        .map((field) => ({ field, message: "0 이상의 숫자를 입력해 주세요." })),
      ...textFields
        .filter((key) => text(body[key]) === "")
        .map((field) => ({ field, message: "필수 항목입니다." })),
    ];
    if (fieldErrors.length > 0) return mockErrors.validation(fieldErrors);
    const now = new Date().toISOString();
    for (const quote of lead.quotes) {
      if (quote.supersededAt === null) quote.supersededAt = now;
    }
    const previous = lead.quotes.at(-1);
    leadState.nextQuoteId += 1;
    const quote = quoteOf(leadState.nextQuoteId, (previous?.versionNo ?? 0) + 1, {
      officeCount: Number(body.officeCount),
      seatCount: Number(body.seatCount),
      quoteAmount: Number(body.quoteAmount),
      taxAmount: Number(body.taxAmount),
      serviceScope: text(body.serviceScope),
      deliveryDueAt: text(body.deliveryDueAt),
      paymentMethod: text(body.paymentMethod),
      refundTerms: text(body.refundTerms),
      issuedAt: now,
      issuedByOperatorName: getMockOperator()?.name ?? "운영자",
      expiresAt: iso(14 * DAY),
    });
    lead.quotes.push(quote);
    touch(lead, "QUOTED", event("QUOTE_ISSUED", lead.status, "QUOTED", { quoteId: quote.quoteId }));
    return HttpResponse.json(
      {
        quoteId: quote.quoteId,
        quoteVersion: quote.versionNo,
        quoteExpiresAt: quote.expiresAt,
        leadId: lead.leadId,
        leadStatus: lead.status,
        supersededQuoteId: previous?.quoteId ?? null,
        updatedAt: lead.updatedAt,
        version: lead.version,
      },
      { status: 201 },
    );
  }),

  http.post("/api/ops/enterprise-leads/:leadId/contract", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const lead = findLead(params.leadId);
    const blocked = guard(lead, request, "CONTRACT", true);
    if (blocked || !lead) return blocked ?? mockErrors.notFound();
    const body = await readBody(request);
    const reference = text(body.contractReference);
    const contractedAt = Date.parse(text(body.contractedAt));
    if (reference === "" || reference.length > 100 || Number.isNaN(contractedAt)) {
      return mockErrors.validation([{ field: "contractReference", message: "확인해 주세요." }]);
    }
    if (contractedAt > Date.now()) {
      return mockErrors.validation([
        { field: "contractedAt", message: "현재 시각 이전이어야 합니다." },
      ]);
    }
    lead.contractReference = reference;
    lead.contractedAt = text(body.contractedAt);
    touch(
      lead,
      "CONTRACTED",
      event("CONTRACTED", lead.status, "CONTRACTED", { reason: reference }),
    );
    return HttpResponse.json({
      leadId: lead.leadId,
      status: lead.status,
      contractReference: reference,
      contractedAt: lead.contractedAt,
      updatedAt: lead.updatedAt,
      version: lead.version,
    });
  }),

  http.post("/api/ops/enterprise-leads/:leadId/close", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const lead = findLead(params.leadId);
    const blocked = guard(lead, request, "CLOSE", true);
    if (blocked || !lead) return blocked ?? mockErrors.notFound();
    const body = await readBody(request);
    const reason = text(body.closedReason);
    const note = text(body.closedNote);
    if (
      !["NO_RESPONSE", "CUSTOMER_WITHDREW", "OUT_OF_SCOPE", "DUPLICATE", "OTHER"].includes(reason)
    ) {
      return mockErrors.validation([{ field: "closedReason", message: "허용되지 않는 값입니다." }]);
    }
    if (reason === "OTHER" && note === "") {
      return mockErrors.validation([{ field: "closedNote", message: "메모를 입력해 주세요." }]);
    }
    const from = lead.status;
    lead.closedReason = reason;
    lead.closedNote = note === "" ? null : note;
    lead.closedFromStatus = from;
    lead.closedAt = new Date().toISOString();
    touch(lead, "CLOSED", event("CLOSED", from, "CLOSED", { reason }));
    return HttpResponse.json({
      leadId: lead.leadId,
      status: lead.status,
      closedReason: reason,
      closedFromStatus: from,
      closedAt: lead.closedAt,
      updatedAt: lead.updatedAt,
      version: lead.version,
    });
  }),

  http.post("/api/ops/enterprise-leads/:leadId/reopen", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const lead = findLead(params.leadId);
    const blocked = guard(lead, request, "REOPEN", false);
    if (blocked || !lead) return blocked ?? mockErrors.notFound();
    const body = await readBody(request);
    const reason = text(body.reason);
    if (reason === "" || reason.length > 500) {
      return mockErrors.validation([{ field: "reason", message: "1자에서 500자까지 입니다." }]);
    }
    const from = lead.closedFromStatus ?? "RECEIVED";
    const target = ["QUOTED", "ACCEPTED", "REJECTED"].includes(from) ? "CONSULTING" : from;
    if (body.assignedOperatorId !== undefined && body.assignedOperatorId !== null) {
      const id = Number(body.assignedOperatorId);
      const name = OPERATOR_NAMES[id];
      if (!name) return errorResponse(409, "ASSIGNEE_NOT_ELIGIBLE", "활성 지원 운영자가 아닙니다.");
      lead.assignedOperatorId = id;
      lead.assignedOperatorName = name;
    }
    if (target !== "RECEIVED" && lead.assignedOperatorId === null) {
      return errorResponse(409, "ASSIGNEE_REQUIRED", "재개하려면 담당 운영자가 필요합니다.");
    }
    lead.closedReason = null;
    lead.closedNote = null;
    lead.closedFromStatus = null;
    lead.closedAt = null;
    touch(lead, target, event("REOPENED", "CLOSED", target, { reason }));
    return HttpResponse.json({
      leadId: lead.leadId,
      status: lead.status,
      assignedOperatorId: lead.assignedOperatorId,
      updatedAt: lead.updatedAt,
      version: lead.version,
    });
  }),
];

/* 평가 이의 */

type MockDispute = {
  disputeId: number;
  status: "OPEN" | "UPHELD" | "REMOVED";
  reasonCode: "FACT_INCORRECT" | "WRONG_TARGET" | "OTHER";
  reasonText: string;
  filedAt: string;
  dueAt: string;
  review: {
    reviewId: number;
    scheduleItemId: number;
    reviewStatus: "ACTIVE" | "DISPUTED" | "REMOVED" | "WITHDRAWN";
    actualVisitedAt: string;
    answers: Record<string, string>;
    submittedAt: string;
    lastRevisedAt: string;
    revisionCount: number;
    approverType: "OCCUPANT" | "OWNER" | "DELEGATE";
    issuerIsReviewedBroker: boolean;
  };
  reviewedBroker: {
    membershipId: number;
    brokerName: string;
    officeId: number;
    officeName: string;
  };
  decidedAt: string | null;
  decisionNote: string | null;
};

function disputeOf(
  disputeId: number,
  reviewId: number,
  patch: Partial<Omit<MockDispute, "review">> & { review?: Partial<MockDispute["review"]> } = {},
): MockDispute {
  const { review, ...rest } = patch;
  return {
    disputeId,
    status: "OPEN",
    reasonCode: "FACT_INCORRECT",
    reasonText: "해당 시각에 방문 확인 연락을 드렸습니다.",
    filedAt: iso(-5 * DAY),
    dueAt: iso(2 * DAY),
    review: {
      reviewId,
      scheduleItemId: 6000 + reviewId,
      reviewStatus: "DISPUTED",
      actualVisitedAt: iso(-7 * DAY),
      answers: { punctuality: "NO", advanceContact: "NO", asRequested: "YES" },
      submittedAt: iso(-6 * DAY),
      lastRevisedAt: iso(-6 * DAY),
      revisionCount: 0,
      approverType: "OWNER",
      issuerIsReviewedBroker: true,
      ...review,
    },
    reviewedBroker: {
      membershipId: 1200 + disputeId,
      brokerName: "김중개",
      officeId: 101,
      officeName: "예시 공인중개사사무소",
    },
    decidedAt: null,
    decisionNote: null,
    ...rest,
  };
}

function seedDisputes(): MockDispute[] {
  return [
    disputeOf(8201, 8101, { filedAt: iso(-8 * DAY), dueAt: iso(-DAY) }),
    disputeOf(8202, 8102, {
      reasonCode: "WRONG_TARGET",
      reasonText: "다른 중개사의 방문이었습니다.",
      filedAt: iso(-4 * DAY),
      review: { approverType: "OCCUPANT", issuerIsReviewedBroker: false, revisionCount: 2 },
    }),
    disputeOf(8203, 8103, {
      status: "UPHELD",
      reasonCode: "OTHER",
      filedAt: iso(-20 * DAY),
      decidedAt: iso(-15 * DAY),
      decisionNote: "연락 기록이 확인되지 않아 평가를 유지합니다.",
      review: { reviewStatus: "ACTIVE" },
    }),
    disputeOf(8204, 8104, {
      status: "REMOVED",
      filedAt: iso(-18 * DAY),
      decidedAt: iso(-12 * DAY),
      decisionNote: "방문 확인 연락 기록이 확인되어 삭제합니다.",
      review: { reviewStatus: "REMOVED" },
    }),
  ];
}

const standaloneReviews = (): Record<number, "ACTIVE" | "REMOVED"> => ({
  8105: "ACTIVE",
  8106: "REMOVED",
});

const disputeState = { disputes: seedDisputes(), reviews: standaloneReviews() };

function reviewResponse(
  reviewId: number,
  reviewStatus: "ACTIVE" | "REMOVED",
  dispute: MockDispute | null,
) {
  const now = new Date().toISOString();
  return {
    reviewId,
    reviewStatus,
    disputeId: dispute?.disputeId ?? null,
    disputeStatus: dispute && dispute.status !== "OPEN" ? dispute.status : null,
    removedAt: reviewStatus === "REMOVED" ? now : null,
    decidedAt: now,
  };
}

function validNote(body: Record<string, unknown>): string | null {
  const note = text(body.decisionNote);
  return note.length >= 1 && note.length <= 500 ? note : null;
}

const disputeHandlers: RequestHandler[] = [
  http.get("/api/ops/visit-review-disputes", ({ request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const statuses = (url.searchParams.get("status") ?? "OPEN").split(",");
    if (!statuses.every((status) => ["OPEN", "UPHELD", "REMOVED"].includes(status))) {
      return mockErrors.validation([{ field: "status", message: "허용되지 않는 값입니다." }]);
    }
    const rows = disputeState.disputes
      .filter((dispute) => statuses.includes(dispute.status))
      .sort((a, b) => Date.parse(a.filedAt) - Date.parse(b.filedAt));
    return HttpResponse.json(pageOf(rows, url));
  }),

  http.post("/api/ops/visit-review-disputes/:disputeId/decision", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const dispute = disputeState.disputes.find(
      (item) => String(item.disputeId) === String(params.disputeId),
    );
    if (!dispute) return mockErrors.notFound();
    const body = await readBody(request);
    const note = validNote(body);
    if (!["UPHELD", "REMOVED"].includes(text(body.decision))) {
      return mockErrors.validation([{ field: "decision", message: "허용되지 않는 값입니다." }]);
    }
    if (note === null) {
      return mockErrors.validation([
        { field: "decisionNote", message: "1자에서 500자까지 입력해 주세요." },
      ]);
    }
    if (dispute.status !== "OPEN") {
      return errorResponse(409, "INVALID_TRANSITION", "이미 결정된 이의입니다.");
    }
    dispute.status = text(body.decision) as "UPHELD" | "REMOVED";
    dispute.decidedAt = new Date().toISOString();
    dispute.decisionNote = note;
    dispute.review.reviewStatus = dispute.status === "REMOVED" ? "REMOVED" : "ACTIVE";
    return HttpResponse.json(
      reviewResponse(
        dispute.review.reviewId,
        dispute.status === "REMOVED" ? "REMOVED" : "ACTIVE",
        dispute,
      ),
    );
  }),

  http.post("/api/ops/visit-reviews/:reviewId/remove", async ({ params, request }) => {
    const rejected = requireMockOps(SUPPORT);
    if (rejected) return rejected;
    const reviewId = Number(params.reviewId);
    const linked = disputeState.disputes.find((item) => item.review.reviewId === reviewId);
    const standalone = disputeState.reviews[reviewId];
    if (!linked && standalone === undefined) return mockErrors.notFound();
    const body = await readBody(request);
    const note = validNote(body);
    if (
      !["LEGAL_REQUEST", "PRIVACY_REQUEST", "OPERATOR_DISCRETION"].includes(text(body.reasonCode))
    ) {
      return mockErrors.validation([{ field: "reasonCode", message: "허용되지 않는 값입니다." }]);
    }
    if (note === null) {
      return mockErrors.validation([
        { field: "decisionNote", message: "1자에서 500자까지 입력해 주세요." },
      ]);
    }
    const currentStatus = linked ? linked.review.reviewStatus : standalone;
    if (currentStatus !== "ACTIVE" && currentStatus !== "DISPUTED") {
      return errorResponse(409, "INVALID_TRANSITION", "삭제할 수 없는 평가 상태입니다.");
    }
    if (linked) {
      linked.review.reviewStatus = "REMOVED";
      if (linked.status === "OPEN") {
        linked.status = "REMOVED";
        linked.decidedAt = new Date().toISOString();
        linked.decisionNote = note;
      }
    } else {
      disputeState.reviews[reviewId] = "REMOVED";
    }
    return HttpResponse.json(reviewResponse(reviewId, "REMOVED", linked ?? null));
  }),
];

/* 비회원 권리 요청 */

type MockIntake = {
  intakeId: number;
  officeId: number;
  officeName: string;
  linkKind: string;
  requestType: string;
  requesterRole: string;
  contactChannel: string;
  maskedContact: string | null;
  verificationStatus: string;
  status: "RECEIVED" | "CONVERTED" | "CLOSED";
  receivedAt: string;
  internalDueAt: string;
  privacyRequestId: number | null;
  closedReason: string | null;
};

function seedIntakes(): MockIntake[] {
  return [
    {
      intakeId: 41,
      officeId: 12,
      officeName: "사무소 예시",
      linkKind: "APPROVER_PROPERTY",
      requestType: "ACCESS",
      requesterRole: "SELF",
      contactChannel: "EMAIL",
      maskedContact: "re***@example.com",
      verificationStatus: "PENDING",
      status: "RECEIVED",
      receivedAt: iso(-3 * DAY),
      internalDueAt: iso(4 * DAY),
      privacyRequestId: null,
      closedReason: null,
    },
    {
      intakeId: 42,
      officeId: 13,
      officeName: "한강공인중개사사무소",
      linkKind: "CUSTOMER",
      requestType: "DELETION",
      requesterRole: "AGENT",
      contactChannel: "PHONE",
      maskedContact: "010-****-1234",
      verificationStatus: "PENDING",
      status: "RECEIVED",
      receivedAt: iso(-2 * DAY),
      internalDueAt: iso(5 * DAY),
      privacyRequestId: null,
      closedReason: null,
    },
    {
      intakeId: 43,
      officeId: 12,
      officeName: "사무소 예시",
      linkKind: "APPROVER_PORTAL",
      requestType: "CORRECTION",
      requesterRole: "SELF",
      contactChannel: "EMAIL",
      maskedContact: "ke***@example.com",
      verificationStatus: "VERIFIED",
      status: "CONVERTED",
      receivedAt: iso(-9 * DAY),
      internalDueAt: iso(-2 * DAY),
      privacyRequestId: 8801,
      closedReason: null,
    },
    {
      intakeId: 44,
      officeId: 14,
      officeName: "북악부동산",
      linkKind: "APPROVER_PROPERTY",
      requestType: "SUSPENSION",
      requesterRole: "AGENT",
      contactChannel: "EMAIL",
      maskedContact: null,
      verificationStatus: "FAILED",
      status: "CLOSED",
      receivedAt: iso(-12 * DAY),
      internalDueAt: iso(-5 * DAY),
      privacyRequestId: null,
      closedReason: "UNVERIFIABLE",
    },
  ];
}

const intakeState = { intakes: seedIntakes(), nextPrivacyRequestId: 8900 };

const CLOSE_REASONS = ["DUPLICATE", "NOT_SUBJECT", "UNVERIFIABLE", "WITHDRAWN_BY_REQUESTER"];

const intakeHandlers: RequestHandler[] = [
  http.get("/api/ops/guest-privacy-intakes", ({ request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const officeId = url.searchParams.get("officeId");
    const rows = intakeState.intakes
      .filter((item) => !status || item.status === status)
      .filter((item) => !officeId || String(item.officeId) === officeId)
      .map((item) => {
        const { closedReason, ...rest } = item;
        void closedReason;
        return rest;
      });
    return HttpResponse.json(pageOf(rows, url));
  }),

  http.post("/api/ops/guest-privacy-intakes/:intakeId/resolve", async ({ params, request }) => {
    const rejected = requireMockOps(PRIVACY);
    if (rejected) return rejected;
    const intake = intakeState.intakes.find(
      (item) => String(item.intakeId) === String(params.intakeId),
    );
    if (!intake) return mockErrors.notFound();
    const body = await readBody(request);
    const verification = text(body.verificationResult);
    const action = text(body.action);
    if (!["VERIFIED", "FAILED"].includes(verification) || !["CONVERT", "CLOSE"].includes(action)) {
      return mockErrors.validation([{ field: "action", message: "허용되지 않는 값입니다." }]);
    }
    if (verification === "FAILED" && action === "CONVERT") {
      return mockErrors.validation([
        { field: "action", message: "본인 확인에 실패하면 종결만 할 수 있습니다." },
      ]);
    }
    if (action === "CONVERT" && (text(body.legalBasis) === "" || text(body.requestScope) === "")) {
      return mockErrors.validation([
        { field: "legalBasis", message: "법적 근거와 요청 범위가 필요합니다." },
      ]);
    }
    if (action === "CLOSE" && !CLOSE_REASONS.includes(text(body.closeReason))) {
      return mockErrors.validation([{ field: "closeReason", message: "종결 사유가 필요합니다." }]);
    }
    const legalDue = Date.parse(text(body.legalDueAt));
    const internalDue = Date.parse(text(body.internalDueAt));
    if (!Number.isNaN(legalDue) && !Number.isNaN(internalDue) && legalDue < internalDue) {
      return mockErrors.validation([
        { field: "legalDueAt", message: "법정 기한은 내부 기한 이후여야 합니다." },
      ]);
    }
    if (intake.status === "CONVERTED" && action === "CONVERT") {
      return errorResponse(409, "GUEST_INTAKE_ALREADY_CONVERTED", "이미 전환된 접수입니다.");
    }
    if (intake.status !== "RECEIVED") {
      return errorResponse(409, "INVALID_TRANSITION", "이미 처리된 접수입니다.");
    }
    intake.verificationStatus = verification;
    if (action === "CONVERT") {
      intakeState.nextPrivacyRequestId += 1;
      intake.status = "CONVERTED";
      intake.privacyRequestId = intakeState.nextPrivacyRequestId;
    } else {
      intake.status = "CLOSED";
      intake.closedReason = text(body.closeReason);
    }
    return HttpResponse.json({
      intakeId: intake.intakeId,
      status: intake.status,
      verificationStatus: verification,
      privacyRequestId: intake.privacyRequestId,
      closedReason: intake.closedReason,
    });
  }),
];

export function resetMockOpsSupport(): void {
  supportState.inquiries = seedInquiries();
  supportState.nextMessageId = 100;
  supportState.nextAttachmentId = 100;
  leadState.leads = seedLeads();
  leadState.nextQuoteId = 100;
  disputeState.disputes = seedDisputes();
  disputeState.reviews = standaloneReviews();
  intakeState.intakes = seedIntakes();
  intakeState.nextPrivacyRequestId = 8900;
}

export const opsSupportHandlers: RequestHandler[] = [
  ...inquiryHandlers,
  ...leadHandlers,
  ...disputeHandlers,
  ...intakeHandlers,
];
