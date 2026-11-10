import { http, HttpResponse } from "msw";
import type {
  ApproverPreferredBrokerListResponse,
  ApproverVisitReviewListResponse,
  BrokerReceivedVisitReviewListResponse,
  BrokerVisitTrustSummaryResponse,
} from "@/lib/api/contracts/visit.schema";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockVisitState } from "./visit";
import { getMockApproverState, linkResolver, portalResolver } from "./visit-approver";
import type { ApproverResolver } from "./visit-approver";

const NOW = "2026-11-10T09:00:00+09:00";

export type MockReview = ApproverVisitReviewListResponse["items"][number] & {
  approvalId: number;
};
export type MockPreferred = {
  approvalId: number;
  preferredBrokerId: number;
  applicantOfficeName: string;
  applicantBrokerName: string;
  designatedAt: string;
  releasedAt: string | null;
};
export type MockCandidate = ApproverPreferredBrokerListResponse["candidates"][number] & {
  approvalId: number;
};
export type MockReceived = BrokerReceivedVisitReviewListResponse["items"][number] & {
  mine: boolean;
};

export type ReviewMockState = {
  reviews: MockReview[];
  preferred: MockPreferred[];
  candidates: MockCandidate[];
  trust: BrokerVisitTrustSummaryResponse;
  received: MockReceived[];
  claimPhone: string;
  validCode: string;
  otpExpired: boolean;
  profilePhone: string;
  reauthDone: boolean;
  bulkImpactIds: number[];
  bulkLimit: number;
  nextId: number;
};

export function buildMockReview(
  partial: Partial<MockReview> & Pick<MockReview, "scheduleItemId">,
): MockReview {
  return {
    approvalId: 7001,
    scheduledStartAt: "2026-11-05T10:00:00+09:00",
    scheduledEndAt: "2026-11-05T11:00:00+09:00",
    actualVisitedAt: "2026-11-05T10:05:00+09:00",
    applicantOfficeName: "정릉부동산",
    applicantBrokerName: "김중개",
    reviewDeadlineAt: "2026-11-19T10:00:00+09:00",
    reviewStatus: "NONE",
    editable: true,
    revisionCount: 0,
    revisionsRemaining: 2,
    version: null,
    answers: null,
    isPreferredBroker: false,
    ...partial,
  };
}

export function buildMockReceived(
  partial: Partial<MockReceived> & Pick<MockReceived, "reviewId">,
): MockReceived {
  return {
    mine: true,
    scheduleItemId: 5001,
    actualVisitedAt: "2026-11-05T10:05:00+09:00",
    propertyName: "국민대 앞 아파트",
    reviewedBrokerName: "김중개",
    reviewStatus: "ACTIVE",
    answers: { punctuality: "YES", advanceContact: "YES", asRequested: "NO" },
    submittedAt: "2026-11-06T09:00:00+09:00",
    lastRevisedAt: "2026-11-06T09:00:00+09:00",
    canDispute: true,
    dispute: null,
    ...partial,
  };
}

function initialState(): ReviewMockState {
  return {
    reviews: [],
    preferred: [],
    candidates: [],
    trust: {
      policyVersion: "TRUST_V1",
      asOf: NOW,
      windowMonths: 12,
      state: "AVAILABLE",
      overallBand: "HIGH",
      completedVisitCount: 12,
      evaluatedVisitCount: 8,
      distinctApproverCount: 5,
      excludedReviewCount: 1,
      indicators: [
        { indicator: "PUNCTUALITY", answeredCount: 8, yesCount: 7, band: "HIGH" },
        { indicator: "ADVANCE_CONTACT", answeredCount: 8, yesCount: 5, band: "MID" },
        { indicator: "AS_REQUESTED", answeredCount: 7, yesCount: 7, band: "HIGH" },
      ],
      unconfirmedIndicators: ["ACCESS_DISTANCE", "PROPERTY_TYPE_FIT", "VERIFIED_DEALS"],
    },
    received: [],
    claimPhone: "01012345678",
    validCode: "123456",
    otpExpired: false,
    profilePhone: "010-****-5678",
    reauthDone: false,
    bulkImpactIds: [],
    bulkLimit: 20,
    nextId: 9500,
  };
}

let state = initialState();

export function resetMockVisitReviewState(): void {
  state = initialState();
}

export function getMockVisitReviewState(): ReviewMockState {
  return state;
}

export function setMockVisitReviewState(partial: Partial<ReviewMockState>): void {
  state = { ...state, ...partial };
}

function notice() {
  return {
    noticeCode: "GUEST_LINK_NOTICE_APPROVER",
    noticeVersion: getMockApproverState().noticeVersion,
    retentionDays: 365,
  };
}

const readOnly = () =>
  errorResponse(403, "APPROVER_READ_ONLY", "공동 승인자는 읽기만 할 수 있습니다.");

const noticeChanged = () =>
  errorResponse(409, "NOTICE_VERSION_CHANGED", "개인정보 안내 버전이 바뀌었습니다.");

const unauthenticated = () => errorResponse(401, "UNAUTHENTICATED", "세션이 만료되었습니다.");

function portalGuard(): Response | null {
  return getMockApproverState().portalSession ? null : unauthenticated();
}

type Answer = "YES" | "NO" | "SKIP";
type AnswerBody = {
  punctuality: Answer;
  advanceContact: Answer;
  asRequested: Answer;
  acknowledgedNoticeVersion: string;
};

function reviewBody(item: MockReview) {
  const { approvalId, ...rest } = item;
  void approvalId;
  return rest;
}

function reviewResult(item: MockReview) {
  return {
    scheduleItemId: item.scheduleItemId,
    reviewStatus: item.reviewStatus === "WITHDRAWN" ? "WITHDRAWN" : "SUBMITTED",
    answers: item.answers,
    revisionCount: item.revisionCount,
    revisionsRemaining: item.revisionsRemaining,
    reviewDeadlineAt: item.reviewDeadlineAt,
    submittedAt: NOW,
    lastRevisedAt: NOW,
    version: item.version,
  };
}

function findReview(approvalId: number, itemId: string | readonly string[] | undefined) {
  return state.reviews.find(
    (item) => String(item.scheduleItemId) === String(itemId) && item.approvalId === approvalId,
  );
}

function reviewHandlers(prefix: string, resolver: ApproverResolver) {
  return [
    http.get(`${prefix}/visit-reviews`, ({ params }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      return HttpResponse.json({
        propertyAddress: "서울특별시 성북구 정릉로 77",
        reviewWindowDays: 14,
        items: state.reviews
          .filter((item) => item.approvalId === resolved.info.approvalId)
          .map(reviewBody),
        privacyNotice: notice(),
      });
    }),

    http.put(`${prefix}/visit-reviews/:itemId`, async ({ params, request }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      if (resolved.info.role === "CO_APPROVER") return readOnly();
      const target = findReview(resolved.info.approvalId, params.itemId);
      if (!target) return mockErrors.notFound();
      const body = (await request.json()) as AnswerBody;
      const values = [body.punctuality, body.advanceContact, body.asRequested];
      if (values.every((value) => value === "SKIP")) {
        return mockErrors.validation([{ field: "punctuality", message: "하나 이상 답해 주세요." }]);
      }
      if (body.acknowledgedNoticeVersion !== getMockApproverState().noticeVersion) {
        return noticeChanged();
      }
      const exhausted = target.reviewStatus === "SUBMITTED" && target.revisionsRemaining <= 0;
      if (target.reviewStatus === "LOCKED" || exhausted) {
        return errorResponse(409, "VISIT_REVIEW_LOCKED", "잠긴 평가입니다.");
      }
      if (!target.editable) {
        return errorResponse(409, "VISIT_REVIEW_WINDOW_CLOSED", "평가 입력 기한이 지났습니다.");
      }
      const header = request.headers.get("If-Match");
      if (target.version !== null && target.version !== undefined) {
        if (header === null || Number.isNaN(Number(header))) {
          return mockErrors.validation([{ field: "If-Match", message: "평가 버전이 필요합니다." }]);
        }
        if (Number(header) !== target.version) return mockErrors.versionConflict(target.version);
      }
      const revisionCount = target.reviewStatus === "NONE" ? 0 : target.revisionCount + 1;
      const updated: MockReview = {
        ...target,
        reviewStatus: "SUBMITTED",
        answers: {
          punctuality: body.punctuality,
          advanceContact: body.advanceContact,
          asRequested: body.asRequested,
        },
        revisionCount,
        revisionsRemaining: Math.max(0, 2 - revisionCount),
        version: (target.version ?? 0) + 1,
      };
      state.reviews = state.reviews.map((item) => (item === target ? updated : item));
      return HttpResponse.json(reviewResult(updated));
    }),

    http.post(`${prefix}/visit-reviews/:itemId/withdraw`, ({ params, request }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      if (resolved.info.role === "CO_APPROVER") return readOnly();
      const target = findReview(resolved.info.approvalId, params.itemId);
      if (!target) return mockErrors.notFound();
      if (target.reviewStatus === "LOCKED") {
        return errorResponse(409, "VISIT_REVIEW_LOCKED", "잠긴 평가입니다.");
      }
      if (!target.editable) {
        return errorResponse(409, "VISIT_REVIEW_WINDOW_CLOSED", "평가 입력 기한이 지났습니다.");
      }
      const header = request.headers.get("If-Match");
      if (header === null || Number.isNaN(Number(header))) {
        return mockErrors.validation([{ field: "If-Match", message: "평가 버전이 필요합니다." }]);
      }
      if (Number(header) !== target.version) return mockErrors.versionConflict(target.version ?? 0);
      const updated: MockReview = {
        ...target,
        reviewStatus: "WITHDRAWN",
        answers: null,
        version: (target.version ?? 0) + 1,
      };
      state.reviews = state.reviews.map((item) => (item === target ? updated : item));
      return HttpResponse.json(reviewResult(updated));
    }),

    http.get(`${prefix}/preferred-brokers`, ({ params }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      const approvalId = resolved.info.approvalId;
      return HttpResponse.json({
        maxActiveCount: 5,
        items: state.preferred
          .filter((item) => item.approvalId === approvalId && item.releasedAt === null)
          .map(({ approvalId: owner, releasedAt, ...rest }) => {
            void owner;
            void releasedAt;
            return rest;
          }),
        candidates: state.candidates
          .filter((item) => item.approvalId === approvalId)
          .map(({ approvalId: owner, ...rest }) => {
            void owner;
            return rest;
          }),
        privacyNotice: notice(),
      });
    }),

    http.post(`${prefix}/preferred-brokers`, async ({ params, request }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      if (resolved.info.role === "CO_APPROVER") return readOnly();
      const body = (await request.json()) as {
        sourceRequestId?: number;
        sourceScheduleItemId?: number;
        acknowledgedNoticeVersion: string;
      };
      if (body.acknowledgedNoticeVersion !== getMockApproverState().noticeVersion) {
        return noticeChanged();
      }
      const approvalId = resolved.info.approvalId;
      const candidate = state.candidates.find(
        (item) =>
          item.approvalId === approvalId &&
          ((body.sourceRequestId !== undefined && item.sourceRequestId === body.sourceRequestId) ||
            (body.sourceScheduleItemId !== undefined &&
              item.sourceScheduleItemId === body.sourceScheduleItemId)),
      );
      if (!candidate) return mockErrors.notFound();
      const active = state.preferred.filter(
        (item) => item.approvalId === approvalId && item.releasedAt === null,
      );
      const duplicate = active.some(
        (item) =>
          item.applicantOfficeName === candidate.applicantOfficeName &&
          item.applicantBrokerName === candidate.applicantBrokerName,
      );
      if (duplicate) {
        return errorResponse(409, "PREFERRED_BROKER_DUPLICATE", "이미 지정한 중개사입니다.");
      }
      if (active.length >= 5) {
        return errorResponse(422, "PREFERRED_BROKER_LIMIT_EXCEEDED", "지정은 5명까지입니다.");
      }
      const created: MockPreferred = {
        approvalId,
        preferredBrokerId: state.nextId++,
        applicantOfficeName: candidate.applicantOfficeName,
        applicantBrokerName: candidate.applicantBrokerName,
        designatedAt: NOW,
        releasedAt: null,
      };
      state.preferred = [...state.preferred, created];
      return HttpResponse.json(
        {
          preferredBrokerId: created.preferredBrokerId,
          applicantOfficeName: created.applicantOfficeName,
          applicantBrokerName: created.applicantBrokerName,
          designatedAt: NOW,
          releasedAt: null,
        },
        { status: 201 },
      );
    }),

    http.post(`${prefix}/preferred-brokers/:brokerId/release`, ({ params }) => {
      const resolved = resolver(params.token);
      if (resolved.kind === "error") return resolved.response;
      if (resolved.info.role === "CO_APPROVER") return readOnly();
      const target = state.preferred.find(
        (item) =>
          String(item.preferredBrokerId) === params.brokerId &&
          item.approvalId === resolved.info.approvalId &&
          item.releasedAt === null,
      );
      if (!target) return mockErrors.notFound();
      state.preferred = state.preferred.map((item) =>
        item === target ? { ...item, releasedAt: NOW } : item,
      );
      return HttpResponse.json({
        preferredBrokerId: target.preferredBrokerId,
        applicantOfficeName: target.applicantOfficeName,
        applicantBrokerName: target.applicantBrokerName,
        designatedAt: target.designatedAt,
        releasedAt: NOW,
      });
    }),
  ];
}

const SENSITIVE = /\d{6}-?[1-4]\d{6}/;

function previewItem(approvalId: number) {
  const target = getMockApproverState().portalApprovals.find(
    (item) => item.approvalId === approvalId,
  );
  let ineligibleReason: "NOT_LINKED" | "NOT_PRIMARY" | "APPROVAL_INACTIVE" | null = null;
  if (!target || target.linkState !== "LINKED") ineligibleReason = "NOT_LINKED";
  else if (target.approvalRole !== "PRIMARY") ineligibleReason = "NOT_PRIMARY";
  else if (!target.approvalActive) ineligibleReason = "APPROVAL_INACTIVE";
  const hasImpact = ineligibleReason === null && state.bulkImpactIds.includes(approvalId);
  return {
    approvalId,
    propertyDisplayName: target?.propertyDisplayName ?? null,
    eligible: ineligibleReason === null,
    ineligibleReason,
    hasImpact,
    affectedItems: hasImpact
      ? [
          {
            scheduleItemId: approvalId * 10,
            scheduledStartAt: "2026-11-12T10:00:00+09:00",
            scheduledEndAt: "2026-11-12T11:00:00+09:00",
            violatedRules: ["WINDOW_MISMATCH"],
          },
        ]
      : [],
  };
}

const bulkLimitExceeded = () =>
  errorResponse(422, "BULK_LIMIT_EXCEEDED", "한 번에 20개까지 적용할 수 있습니다.");

export const visitReviewHandlers = [
  ...reviewHandlers("/api/public/approver-property-links/:token", linkResolver),
  ...reviewHandlers("/api/approver-portal/approvals/:token", portalResolver),

  http.get("/api/visit-trust/me", () => {
    if (getMockVisitState().callerRole === "DEPUTY") return mockErrors.forbidden();
    return HttpResponse.json(state.trust);
  }),

  http.get("/api/visit-reviews/received", ({ request }) => {
    const role = getMockVisitState().callerRole;
    if (role === "DEPUTY") return mockErrors.forbidden();
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") ?? "ME";
    if (scope === "OFFICE" && role !== "OWNER") return mockErrors.forbidden();
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 25);
    const all = state.received.filter((item) => (scope === "OFFICE" ? true : item.mine));
    const items = all.slice(page * size, page * size + size).map(({ mine, ...rest }) => {
      void mine;
      return rest;
    });
    return HttpResponse.json({ page, size, totalElements: all.length, items });
  }),

  http.post("/api/visit-reviews/:reviewId/disputes", async ({ params, request }) => {
    if (getMockVisitState().callerRole === "DEPUTY") return mockErrors.forbidden();
    const target = state.received.find((item) => String(item.reviewId) === params.reviewId);
    if (!target) return mockErrors.notFound();
    const body = (await request.json()) as { reasonCode: string; reasonText: string };
    if (body.reasonText.length > 500) {
      return mockErrors.validation([
        { field: "reasonText", message: "500자 이내로 입력해 주세요." },
      ]);
    }
    if (SENSITIVE.test(body.reasonText)) {
      return errorResponse(400, "SENSITIVE_DATA_DETECTED", "민감 정보가 포함되어 있습니다.");
    }
    if (target.dispute) {
      return errorResponse(409, "VISIT_REVIEW_DISPUTE_EXISTS", "이미 이의가 접수되었습니다.");
    }
    if (target.reviewStatus !== "ACTIVE") {
      return errorResponse(409, "VISIT_REVIEW_LOCKED", "이의를 낼 수 없는 평가입니다.");
    }
    if (!target.canDispute) {
      return errorResponse(
        409,
        "VISIT_REVIEW_DISPUTE_WINDOW_CLOSED",
        "이의 제기 기한이 지났습니다.",
      );
    }
    const disputeId = state.nextId++;
    state.received = state.received.map((item) =>
      item === target
        ? {
            ...item,
            reviewStatus: "DISPUTED" as const,
            canDispute: false,
            dispute: { disputeId, status: "OPEN" as const, filedAt: NOW, decidedAt: null },
          }
        : item,
    );
    return HttpResponse.json(
      {
        disputeId,
        reviewId: target.reviewId,
        status: "OPEN",
        reasonCode: body.reasonCode,
        filedAt: NOW,
        targetDecisionAt: "2026-11-19T09:00:00+09:00",
        reviewStatus: "DISPUTED",
      },
      { status: 201 },
    );
  }),

  http.post("/api/public/approver-auth/otp", async ({ request }) => {
    const body = (await request.json()) as { purpose: string; phone: string; linkToken?: string };
    const digits = body.phone.replace(/-/g, "");
    if (!/^01\d{8,9}$/.test(digits)) {
      return mockErrors.validation([{ field: "phone", message: "휴대폰 번호 형식이 아닙니다." }]);
    }
    if (body.purpose === "CLAIM" && digits !== state.claimPhone) {
      return errorResponse(422, "APPROVER_CLAIM_NOT_ALLOWED", "번호를 확인해 주세요.");
    }
    if (body.purpose === "REAUTH") {
      const guard = portalGuard();
      if (guard) return guard;
    }
    return HttpResponse.json({ accepted: true, expiresInSeconds: 300, resendAfterSeconds: 60 });
  }),

  http.post("/api/public/approver-auth/verify", async ({ request }) => {
    const body = (await request.json()) as {
      purpose: string;
      code: string;
      acknowledgedNoticeVersion?: string | null;
    };
    if (state.otpExpired) return errorResponse(422, "TOKEN_EXPIRED", "인증번호가 만료되었습니다.");
    if (body.code !== state.validCode) {
      return errorResponse(422, "VERIFICATION_CODE_INVALID", "인증번호가 맞지 않습니다.");
    }
    const approver = getMockApproverState();
    if (body.purpose === "CLAIM" && body.acknowledgedNoticeVersion !== approver.noticeVersion) {
      return noticeChanged();
    }
    approver.portalSession = true;
    if (body.purpose === "REAUTH") state.reauthDone = true;
    return HttpResponse.json({
      profileId: 1,
      maskedPhone: state.profilePhone,
      sessionIdleTimeoutMinutes: 60,
      sessionExpiresAt: "2026-11-10T21:00:00+09:00",
      reauthValidUntil: body.purpose === "REAUTH" ? "2026-11-10T09:10:00+09:00" : null,
      claimedApprovalId: null,
      profileCreated: body.purpose === "CLAIM",
      linkedApprovalCount: approver.portalApprovals.filter((item) => item.linkState === "LINKED")
        .length,
      pendingConfirmCount: approver.portalApprovals.filter(
        (item) => item.linkState === "PENDING_CONFIRM",
      ).length,
      privacyNotice: notice(),
    });
  }),

  http.delete("/api/approver-portal/session", () => {
    const guard = portalGuard();
    if (guard) return guard;
    getMockApproverState().portalSession = false;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/approver-portal/profile", () => {
    const guard = portalGuard();
    if (guard) return guard;
    const approvals = getMockApproverState().portalApprovals;
    return HttpResponse.json({
      profileId: 1,
      maskedPhone: state.profilePhone,
      createdAt: NOW,
      lastLoginAt: NOW,
      linkedApprovalCount: approvals.filter((item) => item.linkState === "LINKED").length,
      pendingConfirmCount: approvals.filter((item) => item.linkState === "PENDING_CONFIRM").length,
    });
  }),

  http.post("/api/approver-portal/profile/close", async ({ request }) => {
    const guard = portalGuard();
    if (guard) return guard;
    const body = (await request.json()) as { confirm: boolean };
    if (!body.confirm) {
      return mockErrors.validation([{ field: "confirm", message: "해지 확인이 필요합니다." }]);
    }
    if (!state.reauthDone) return mockErrors.stepUpRequired();
    const approver = getMockApproverState();
    const count = approver.portalApprovals.filter((item) => item.linkState === "LINKED").length;
    approver.portalApprovals = [];
    approver.portalSession = false;
    state.reauthDone = false;
    return HttpResponse.json({ closedAt: NOW, unlinkedApprovalCount: count, endedSessionCount: 1 });
  }),

  http.get("/api/approver-portal/approvals", () => {
    const guard = portalGuard();
    if (guard) return guard;
    return HttpResponse.json({
      items: getMockApproverState().portalApprovals,
      privacyNotice: notice(),
    });
  }),

  http.post(
    "/api/approver-portal/approvals/:approvalId/link-decision",
    async ({ params, request }) => {
      const guard = portalGuard();
      if (guard) return guard;
      const approver = getMockApproverState();
      const target = approver.portalApprovals.find(
        (item) => String(item.approvalId) === params.approvalId,
      );
      if (!target) return mockErrors.notFound();
      if (target.linkState !== "PENDING_CONFIRM") {
        return errorResponse(409, "INVALID_TRANSITION", "처리할 수 없는 상태입니다.");
      }
      const body = (await request.json()) as { decision: "ACCEPT" | "REJECT" };
      if (body.decision === "ACCEPT") {
        approver.portalApprovals = approver.portalApprovals.map((item) =>
          item === target ? { ...item, linkState: "LINKED" as const } : item,
        );
        return HttpResponse.json({ approvalId: target.approvalId, linkState: "LINKED" });
      }
      approver.portalApprovals = approver.portalApprovals.filter((item) => item !== target);
      return HttpResponse.json({ approvalId: target.approvalId, linkState: "REJECTED" });
    },
  ),

  http.delete("/api/approver-portal/approvals/:approvalId/link", ({ params }) => {
    const guard = portalGuard();
    if (guard) return guard;
    const approver = getMockApproverState();
    const target = approver.portalApprovals.find(
      (item) => String(item.approvalId) === params.approvalId && item.linkState === "LINKED",
    );
    if (!target) return mockErrors.notFound();
    approver.portalApprovals = approver.portalApprovals.filter((item) => item !== target);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/approver-portal/condition-bulk/preview", async ({ request }) => {
    const guard = portalGuard();
    if (guard) return guard;
    const body = (await request.json()) as { approvalIds: number[] };
    if (body.approvalIds.length > state.bulkLimit) return bulkLimitExceeded();
    return HttpResponse.json({ items: body.approvalIds.map(previewItem) });
  }),

  http.post("/api/approver-portal/condition-bulk", async ({ request }) => {
    const guard = portalGuard();
    if (guard) return guard;
    const body = (await request.json()) as {
      approvalIds: number[];
      impactAcknowledgedApprovalIds?: number[] | null;
      acknowledgedNoticeVersion: string;
    };
    if (body.approvalIds.length > state.bulkLimit) return bulkLimitExceeded();
    if (body.acknowledgedNoticeVersion !== getMockApproverState().noticeVersion) {
      return noticeChanged();
    }
    const items = body.approvalIds.map((approvalId) => {
      const preview = previewItem(approvalId);
      if (!preview.eligible) {
        return {
          approvalId,
          result: "FAILED" as const,
          conditionId: null,
          versionNo: null,
          failureCode: preview.ineligibleReason,
          affectedItemCount: 0,
        };
      }
      const acknowledged = (body.impactAcknowledgedApprovalIds ?? []).includes(approvalId);
      if (preview.hasImpact && !acknowledged) {
        return {
          approvalId,
          result: "NEEDS_IMPACT_ACK" as const,
          conditionId: null,
          versionNo: null,
          failureCode: null,
          affectedItemCount: preview.affectedItems.length,
        };
      }
      return {
        approvalId,
        result: "APPLIED" as const,
        conditionId: state.nextId++,
        versionNo: 2,
        failureCode: null,
        affectedItemCount: preview.affectedItems.length,
      };
    });
    return HttpResponse.json({
      batchId: state.nextId++,
      requestedCount: items.length,
      appliedCount: items.filter((item) => item.result === "APPLIED").length,
      needsImpactAckCount: items.filter((item) => item.result === "NEEDS_IMPACT_ACK").length,
      failedCount: items.filter((item) => item.result === "FAILED").length,
      items,
    });
  }),
];
