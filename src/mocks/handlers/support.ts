import { http, HttpResponse } from "msw";
import type {
  EnterpriseLeadStatusResponse,
  PolicyDocumentListResponse,
  PrivacyRequestResponse,
  SupportInquiryListResponse,
  SupportInquiryResponse,
} from "@/lib/api/contracts/support.schema";
import { errorResponse, mockErrors } from "../error-responses";

const NOW = "2026-11-10T09:00:00+09:00";

/** 백엔드처럼 최초 문의 본문은 최상위 content·requestScope에 두고 messages에는 답글만 둔다. */
export type MockInquiry = SupportInquiryResponse;

export type MockSupportInquiryState = {
  inquiries: MockInquiry[];
  nextInquiryId: number;
  nextMessageId: number;
  nextAttachmentId: number;
  policyBody: string | null;
  leads: Array<EnterpriseLeadStatusResponse & { trackingKey: string }>;
  nextLeadId: number;
  privacyRequests: PrivacyRequestResponse[];
  nextPrivacyRequestId: number;
  guestIntakeCount: number;
  guestNoticeVersion: string;
};

export function buildMockPrivacyRequest(
  overrides: Partial<PrivacyRequestResponse> = {},
): PrivacyRequestResponse {
  return {
    requestId: 31,
    requestType: "ACCESS",
    status: "RECEIVED",
    identityStatus: "PENDING",
    receivedAt: NOW,
    legalDueAt: "2026-11-20T09:00:00+09:00",
    internalDueAt: "2026-11-17T09:00:00+09:00",
    completedAt: null,
    decisionReason: null,
    supplementRequest: null,
    responsibleOfficeName: null,
    handlerType: "SAIRO",
    ...overrides,
  };
}

export function buildMockInquiry(overrides: Partial<MockInquiry> = {}): MockInquiry {
  return {
    inquiryId: 11,
    officeId: null,
    category: "BILLING",
    status: "OPEN",
    priority: "NORMAL",
    assignedOperatorName: null,
    responseDueAt: "2026-11-11T18:00:00+09:00",
    answeredAt: null,
    closedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    version: 1,
    content: "결제가 두 번 된 것 같습니다.",
    requestScope: null,
    messages: [],
    attachments: [],
    ...overrides,
  };
}

function initialState(): MockSupportInquiryState {
  return {
    inquiries: [
      buildMockInquiry(),
      buildMockInquiry({
        inquiryId: 12,
        category: "AUTH",
        status: "ANSWERED",
        assignedOperatorName: "김지원",
        answeredAt: "2026-11-10T10:00:00+09:00",
        content: "로그인이 안 됩니다.",
        messages: [
          {
            messageId: 22,
            visibility: "PUBLIC",
            content: "확인 후 안내드렸습니다.",
            createdAt: "2026-11-10T10:00:00+09:00",
            authorType: "OPERATOR",
            authorDisplayName: "김지원",
          },
        ],
      }),
    ],
    nextInquiryId: 100,
    nextMessageId: 300,
    nextAttachmentId: 500,
    policyBody:
      "### 위탁 업체 목록\n\n| 수탁사 | 위탁 업무 |\n| --- | --- |\n| 아마존웹서비스 | 서버 운영 |\n",
    leads: [],
    nextLeadId: 70,
    privacyRequests: [buildMockPrivacyRequest()],
    nextPrivacyRequestId: 200,
    guestIntakeCount: 0,
    guestNoticeVersion: "2026-11-20",
  };
}

export const supportInquiryState: MockSupportInquiryState = initialState();

export function resetSupportInquiryState() {
  Object.assign(supportInquiryState, initialState());
}

function findInquiry(id: string | readonly string[] | undefined) {
  return supportInquiryState.inquiries.find((item) => String(item.inquiryId) === String(id));
}

export const supportHandlers = [
  http.get("/api/support-inquiries/me", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 25);
    const body: SupportInquiryListResponse = {
      items: supportInquiryState.inquiries.slice(page * size, page * size + size).map((item) => ({
        inquiryId: item.inquiryId,
        officeId: item.officeId,
        category: item.category as SupportInquiryListResponse["items"][number]["category"],
        status: item.status as SupportInquiryListResponse["items"][number]["status"],
        priority: item.priority as SupportInquiryListResponse["items"][number]["priority"],
        assignedOperatorName: item.assignedOperatorName,
        responseDueAt: item.responseDueAt,
        answeredAt: item.answeredAt ?? null,
        closedAt: item.closedAt ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        version: item.version,
      })),
      page,
      size,
      totalElements: supportInquiryState.inquiries.length,
    };
    return HttpResponse.json(body);
  }),

  http.post("/api/support-inquiries", async ({ request }) => {
    const body = (await request.json()) as {
      category: string;
      content: string;
      requestScope?: string | null;
    };
    if (/\d{6}-\d{7}/.test(body.content)) {
      return errorResponse(400, "SENSITIVE_DATA_DETECTED", "민감 정보");
    }
    const created = buildMockInquiry({
      inquiryId: supportInquiryState.nextInquiryId,
      category: body.category,
      content: body.content,
      requestScope: body.requestScope ?? null,
      messages: [],
    });
    supportInquiryState.nextInquiryId += 1;
    supportInquiryState.inquiries.unshift(created);
    return HttpResponse.json(
      {
        inquiryId: created.inquiryId,
        status: "OPEN",
        responseDueAt: created.responseDueAt,
        officeId: null,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/support-inquiries/:inquiryId", ({ params }) => {
    const item = findInquiry(params.inquiryId);
    return item ? HttpResponse.json(item) : mockErrors.notFound();
  }),

  http.post("/api/support-inquiries/:inquiryId/replies", async ({ params, request }) => {
    const item = findInquiry(params.inquiryId);
    if (!item) return mockErrors.notFound();
    const body = (await request.json()) as { content: string };
    if (!body.content?.trim()) {
      return mockErrors.validation([{ field: "content", message: "내용이 필요합니다." }]);
    }
    const messageId = supportInquiryState.nextMessageId;
    supportInquiryState.nextMessageId += 1;
    item.messages = [
      ...item.messages,
      {
        messageId,
        visibility: "PUBLIC",
        content: body.content,
        createdAt: NOW,
        authorType: "REQUESTER",
        authorDisplayName: null,
      },
    ];
    item.status =
      item.status === "CLOSED" ? "OPEN" : item.assignedOperatorName ? "ASSIGNED" : "OPEN";
    item.version += 1;
    return HttpResponse.json(
      {
        messageId,
        inquiryId: item.inquiryId,
        visibility: "PUBLIC",
        status: item.status,
        content: body.content,
        createdAt: NOW,
        officeId: null,
        updatedAt: NOW,
        version: item.version,
      },
      { status: 201 },
    );
  }),

  http.post("/api/support-inquiries/:inquiryId/attachments", async ({ params, request }) => {
    const item = findInquiry(params.inquiryId);
    if (!item) return mockErrors.notFound();
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const fileName = file && typeof file !== "string" ? file.name : "첨부.pdf";
    if (item.attachments.length >= 10) {
      return errorResponse(422, "ATTACHMENT_LIMIT_EXCEEDED", "개수 초과");
    }
    const attachment = {
      attachmentId: supportInquiryState.nextAttachmentId,
      fileName,
      mediaType: "application/pdf",
      sizeBytes: 2048,
      scanStatus: "PENDING",
      createdAt: NOW,
      messageId: null,
    };
    supportInquiryState.nextAttachmentId += 1;
    item.attachments = [...item.attachments, attachment];
    return HttpResponse.json(
      { ...attachment, inquiryId: item.inquiryId, scanStatus: "PENDING" },
      { status: 201 },
    );
  }),

  http.get("/api/support-inquiries/:inquiryId/attachments/:attachmentId", ({ params }) => {
    const item = findInquiry(params.inquiryId);
    const attachment = item?.attachments.find(
      (entry) => String(entry.attachmentId) === String(params.attachmentId),
    );
    if (!attachment) return mockErrors.notFound();
    if (attachment.scanStatus !== "CLEAN") {
      return errorResponse(409, "ATTACHMENT_NOT_READY", "검사 전");
    }
    return new HttpResponse("file", { status: 200 });
  }),

  http.get("/api/policy-documents", () => {
    const body: PolicyDocumentListResponse = {
      items: supportInquiryState.policyBody
        ? [
            {
              docType: "SUBPROCESSORS",
              version: "2026-09-01",
              effectiveAt: "2026-09-01T00:00:00+09:00",
              requiresConsent: false,
              body: supportInquiryState.policyBody,
            },
          ]
        : [],
    };
    return HttpResponse.json(body);
  }),

  http.post("/api/enterprise-leads", async ({ request }) => {
    const body = (await request.json()) as { privacyNoticeAcknowledged: boolean };
    if (!body.privacyNoticeAcknowledged) {
      return mockErrors.validation([
        { field: "privacyNoticeAcknowledged", message: "확인이 필요합니다." },
      ]);
    }
    const leadId = supportInquiryState.nextLeadId;
    supportInquiryState.nextLeadId += 1;
    const lead = {
      leadId,
      status: "RECEIVED",
      quoteId: null,
      quoteVersion: null,
      quoteAmount: null,
      quoteExpiresAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      version: 1,
      trackingKey: `key-${leadId}`,
    };
    supportInquiryState.leads.push(lead);
    return HttpResponse.json(
      {
        leadId,
        trackingKey: lead.trackingKey,
        status: "RECEIVED",
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/enterprise-leads/:leadId", ({ params, request }) => {
    const lead = supportInquiryState.leads.find(
      (item) => String(item.leadId) === String(params.leadId),
    );
    if (!lead || lead.trackingKey !== request.headers.get("X-Tracking-Key")) {
      return mockErrors.notFound();
    }
    const { trackingKey, ...rest } = lead;
    void trackingKey;
    return HttpResponse.json(rest);
  }),

  http.post("/api/enterprise-leads/:leadId/quotes/:quoteId/:decision", ({ params, request }) => {
    const lead = supportInquiryState.leads.find(
      (item) => String(item.leadId) === String(params.leadId),
    );
    if (!lead || lead.trackingKey !== request.headers.get("X-Tracking-Key")) {
      return mockErrors.notFound();
    }
    if (params.decision !== "accept" && params.decision !== "reject") return mockErrors.notFound();
    if (lead.status !== "QUOTED") return errorResponse(409, "INVALID_TRANSITION", "처리할 수 없음");
    if (String(lead.quoteId) !== String(params.quoteId)) {
      return errorResponse(409, "QUOTE_SUPERSEDED", "대체됨");
    }
    if (lead.quoteExpiresAt && new Date(lead.quoteExpiresAt).getTime() < Date.now()) {
      return errorResponse(409, "QUOTE_EXPIRED", "만료");
    }
    lead.status = params.decision === "accept" ? "ACCEPTED" : "REJECTED";
    return HttpResponse.json({
      leadId: lead.leadId,
      status: lead.status,
      quoteId: lead.quoteId ?? 0,
      quoteVersion: lead.quoteVersion ?? 1,
      createdAt: NOW,
      updatedAt: NOW,
      version: 2,
    });
  }),

  http.get("/api/privacy-requests/me", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 25);
    const status = url.searchParams.get("status");
    const filtered = supportInquiryState.privacyRequests.filter(
      (item) => !status || item.status === status,
    );
    return HttpResponse.json({
      items: filtered.slice(page * size, page * size + size).map((item) => ({
        requestId: item.requestId,
        requestType: item.requestType,
        status: item.status,
        identityStatus: item.identityStatus,
        receivedAt: item.receivedAt,
        legalDueAt: item.legalDueAt,
        completedAt: item.completedAt ?? null,
        decisionReason: item.decisionReason ?? null,
        responsibleOfficeName: item.responsibleOfficeName ?? null,
      })),
      page,
      size,
      totalElements: filtered.length,
    });
  }),

  http.post("/api/privacy-requests", async ({ request }) => {
    const body = (await request.json()) as { requestType: string; content: string };
    if (/\d{6}-\d{7}/.test(body.content)) {
      return errorResponse(400, "SENSITIVE_DATA_DETECTED", "민감 정보");
    }
    const created = buildMockPrivacyRequest({
      requestId: supportInquiryState.nextPrivacyRequestId,
      requestType: body.requestType as PrivacyRequestResponse["requestType"],
    });
    supportInquiryState.nextPrivacyRequestId += 1;
    supportInquiryState.privacyRequests.unshift(created);
    return HttpResponse.json(
      {
        requestId: created.requestId,
        supportInquiryId: null,
        requestType: created.requestType,
        identityStatus: "PENDING",
        status: "RECEIVED",
        receivedAt: NOW,
        legalDueAt: created.legalDueAt,
        internalDueAt: created.internalDueAt,
      },
      { status: 201 },
    );
  }),

  http.get("/api/privacy-requests/:requestId", ({ params }) => {
    const item = supportInquiryState.privacyRequests.find(
      (entry) => String(entry.requestId) === String(params.requestId),
    );
    return item ? HttpResponse.json(item) : mockErrors.notFound();
  }),

  http.post("/api/public/privacy-intakes", async ({ request }) => {
    const body = (await request.json()) as GuestIntakeBody;
    return guestIntakeResponse(body, body.token === "expired-token");
  }),

  http.post("/api/approver-portal/privacy-intakes", async ({ request }) => {
    const body = (await request.json()) as GuestIntakeBody;
    return guestIntakeResponse(body, false);
  }),
];

type GuestIntakeBody = {
  token?: string;
  approvalId?: number;
  requestType: string;
  contactChannel: string;
  contact: string;
  requestNote?: string | null;
  acknowledgedNoticeVersion: string;
};

function guestIntakeResponse(body: GuestIntakeBody, isLinkMissing: boolean) {
  if (isLinkMissing) return errorResponse(404, "PUBLIC_LINK_NOT_FOUND", "링크 없음");
  if (body.acknowledgedNoticeVersion !== supportInquiryState.guestNoticeVersion) {
    return errorResponse(409, "NOTICE_VERSION_CHANGED", "안내 버전 변경");
  }
  if (/\d{6}-\d{7}/.test(body.requestNote ?? "")) {
    return errorResponse(400, "SENSITIVE_DATA_DETECTED", "민감 정보");
  }
  if (
    body.contactChannel === "EMAIL"
      ? !body.contact.includes("@")
      : /\D/.test(body.contact.replace(/[-\s+]/g, ""))
  ) {
    return errorResponse(422, "GUEST_CONTACT_INVALID", "연락처 오류");
  }
  if (supportInquiryState.guestIntakeCount >= 3) {
    return errorResponse(429, "RATE_LIMITED", "요청 제한", {}, { "Retry-After": "60" });
  }
  supportInquiryState.guestIntakeCount += 1;
  return HttpResponse.json(
    {
      receivedAt: NOW,
      resultDueAt: "2026-11-20T09:00:00+09:00",
      contactChannel: body.contactChannel,
      maskedContact: body.contactChannel === "EMAIL" ? "re***@example.com" : "010-****-5678",
    },
    { status: 201 },
  );
}
