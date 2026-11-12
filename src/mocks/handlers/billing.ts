import { http, HttpResponse } from "msw";
import type {
  BillingInvoiceListResponse,
  BillingPlanListResponse,
  PriceChangeNoticeListResponse,
  PurchaseConsentPreviewResponse,
  RefundRequestListResponse,
  StartCustomerAgreementResponse,
} from "@/lib/api/contracts/billing.schema";
import type { PublicCompanyInfoResponse } from "@/lib/api/contracts/public-site.schema";
import type {
  InvoiceDetail,
  PublicPricing,
  RefundStatus,
  TaxRecipient,
  SubscriptionCurrent,
} from "@/features/billing/api/wire";
import { errorResponse, mockErrors } from "../error-responses";

const NOW = "2026-11-10T09:00:00+09:00";

export const MOCK_PUBLIC_PRICING: PublicPricing = {
  priceVersion: "2026-11",
  effectiveAt: NOW,
  currency: "KRW",
  vatIncluded: true,
  billingCycle: "MONTHLY",
  autoRenew: true,
  plans: [
    {
      planCode: "SOLO",
      minMembers: 1,
      maxMembers: 1,
      baseAmount: 39900,
      includedMembers: 1,
      perSeatAmount: null,
    },
    {
      planCode: "TEAM",
      minMembers: 2,
      maxMembers: 4,
      baseAmount: 39900,
      includedMembers: 1,
      perSeatAmount: 10000,
    },
    {
      planCode: "TEAM",
      minMembers: 5,
      maxMembers: null,
      baseAmount: 69900,
      includedMembers: 4,
      perSeatAmount: 8000,
    },
  ],
  examples: [39900, 49900, 59900, 69900, 77900, 85900, 93900, 101900, 109900, 117900].map(
    (monthlyAmount, index) => ({ members: index + 1, monthlyAmount }),
  ),
  enterprise: { quotedByInquiry: true, autoChargeBeforeApproval: false },
  refundPolicyVersion: "1.0",
  generalTrial: {
    freeEndMode: "DURATION",
    durationDays: 60,
    fixedFreeEndsAt: null,
    applicantWindowEndsAt: null,
  },
  links: {
    termsUrl: "/legal/terms",
    refundUrl: "/legal/refund-policy",
    privacyUrl: "/legal/privacy",
  },
  provisionalPrice: true,
};

export const MOCK_COMPANY_INFO: PublicCompanyInfoResponse = {
  versionNo: 1,
  publishedAt: NOW,
  businessName: "사이로(SAIRO)",
  representativeName: "김태환",
  businessNumber: "000-00-00000",
  address: "서울특별시 예시구 예시로 1",
  contactPhone: "02-000-0000",
  ecommerceNotice: null,
  supportEmail: "support@example.com",
  privacyContact: "privacy@example.com",
  privacyRequestPath: "/privacy-requests",
  links: [
    { kind: "TERMS", title: "이용약관", url: "/legal/policies/TERMS/1.0" },
    { kind: "PRIVACY", title: "개인정보처리방침", url: "/legal/policies/PRIVACY/1.0" },
    { kind: "REFUND", title: "환불정책", url: "/legal/policies/REFUND/1.0" },
  ],
};

export function buildSubscription(partial: Partial<SubscriptionCurrent> = {}): SubscriptionCurrent {
  return {
    status: "TRIAL",
    plan: "TEAM",
    memberCount: 3,
    priceVersion: "2026-11",
    startCustomer: null,
    pendingPriceChangeNoticeCount: 0,
    trialEndsAt: "2027-01-08T23:59:00+09:00",
    currentPeriodEnd: "2027-01-08T23:59:00+09:00",
    nextChargeAt: null,
    nextChargeAmount: null,
    firstBillingScheduledAt: "2027-01-09T00:00:00+09:00",
    prePaymentSince: null,
    pastDueSince: null,
    restrictedAt: null,
    terminationAt: null,
    cancellationEffectiveAt: null,
    outstandingAmount: 0,
    canRetryPayment: false,
    latestInvoice: null,
    paymentMethod: null,
    readiness: { hasValidConsent: false, hasBillingKey: false },
    isInReturnPeriod: false,
    returnPeriodEndsAt: null,
    ...partial,
  };
}

export function buildInvoiceItem(
  partial: Partial<BillingInvoiceListResponse["items"][number]> = {},
): BillingInvoiceListResponse["items"][number] {
  return {
    invoiceId: 501,
    periodStart: "2026-09-26T09:00:00+09:00",
    periodEnd: "2026-10-26T09:00:00+09:00",
    amount: 59900,
    memberCount: 3,
    consentAmountLimit: 59900,
    status: "PAID",
    refundedAmount: 0,
    refundableAmount: 59900,
    ...partial,
  };
}

export type BillingMockState = {
  subscription: SubscriptionCurrent;
  invoices: BillingInvoiceListResponse["items"];
  refunds: RefundRequestListResponse["items"];
  notices: PriceChangeNoticeListResponse["items"];
  agreement: StartCustomerAgreementResponse | null;
  taxRecipient: TaxRecipient;
  nextRefundId: number;
  sessionIssued: boolean;
  authSuspension: {
    authSuspended: boolean;
    suspendedAt: string | null;
    reauthDeadlineAt: string | null;
    trialRemainingSeconds: number | null;
  };
  grant: { signedIn: boolean; revoked: boolean; exportPolls: number };
};

export function createBillingState(): BillingMockState {
  return {
    subscription: buildSubscription(),
    invoices: [buildInvoiceItem()],
    refunds: [],
    notices: [],
    agreement: null,
    taxRecipient: {
      registered: false,
      recipientId: null,
      businessNumber: "",
      companyName: "",
      representativeName: "",
      receiverEmail: null,
      taxType: "GENERAL",
      issueRequested: false,
      registeredAt: null,
    },
    nextRefundId: 900,
    sessionIssued: false,
    authSuspension: {
      authSuspended: false,
      suspendedAt: null,
      reauthDeadlineAt: null,
      trialRemainingSeconds: null,
    },
    grant: { signedIn: false, revoked: false, exportPolls: 0 },
  };
}

export const billingState: BillingMockState = createBillingState();

export function resetBillingState() {
  Object.assign(billingState, createBillingState());
}

export function buildAgreement(
  partial: Partial<StartCustomerAgreementResponse> = {},
): StartCustomerAgreementResponse {
  return {
    agreementId: 7,
    status: "APPROVED",
    freeEndsAt: "2027-06-30T23:59:59+09:00",
    priceVersion: "2026-11",
    priceStartsAt: "2027-07-01T00:00:00+09:00",
    priceEndsAt: "2028-06-30T23:59:59+09:00",
    monthlyAmountPreview: { memberCount: 3, amountInclVat: 59900 },
    conditions: {
      weeklyUseConfirmed: true,
      monthlyInterviewConfirmed: true,
      casePublicationConsent: false,
    },
    agreementTextVersion: "v1",
    contractedOn: "2026-12-01",
    ownerAcknowledgedAt: null,
    version: 1,
    ...partial,
  };
}

export function buildNotice(
  partial: Partial<PriceChangeNoticeListResponse["items"][number]> = {},
): PriceChangeNoticeListResponse["items"][number] {
  return {
    noticeId: 31,
    changeKind: "INCREASE",
    fromPriceVersion: "2026-11",
    toPriceVersion: "2027-03",
    memberCount: 3,
    currentAmountInclVat: 59900,
    newAmountInclVat: 64900,
    notifiedAt: "2027-02-01T09:00:00+09:00",
    effectiveAt: "2027-03-03T00:00:00+09:00",
    appliesFromPeriodStart: "2027-03-09T00:00:00+09:00",
    responseDueAt: "2027-03-02T23:59:00+09:00",
    decision: "PENDING",
    decidedAt: null,
    consentRequired: true,
    ...partial,
  };
}

function plans(): BillingPlanListResponse {
  return {
    priceVersion: "2026-11",
    priceKind: "STANDARD",
    vatIncluded: true,
    memberCount: billingState.subscription.memberCount,
    plans: [
      {
        planCode: "SOLO",
        basePrice: 39900,
        perSeatPrice: null,
        estimatedAmount: null,
        tiers: [
          {
            minMembers: 1,
            maxMembers: 1,
            basePrice: 39900,
            includedMembers: 1,
            perSeatPrice: null,
          },
        ],
      },
      {
        planCode: "TEAM",
        basePrice: 39900,
        perSeatPrice: 10000,
        estimatedAmount: 59900,
        tiers: [
          {
            minMembers: 2,
            maxMembers: 4,
            basePrice: 39900,
            includedMembers: 1,
            perSeatPrice: 10000,
          },
          {
            minMembers: 5,
            maxMembers: null,
            basePrice: 69900,
            includedMembers: 4,
            perSeatPrice: 8000,
          },
        ],
      },
      {
        planCode: "ENTERPRISE",
        basePrice: null,
        perSeatPrice: null,
        estimatedAmount: null,
        tiers: [],
      },
    ],
  };
}

function preview(noticeId: number | null): PurchaseConsentPreviewResponse {
  const amount = noticeId ? 64900 : 59900;
  return {
    termsVersion: "1.0",
    plan: "TEAM",
    memberCount: 3,
    priceVersion: noticeId ? "2027-03" : "2026-11",
    priceChangeNoticeId: noticeId,
    totalAmountInclVat: amount,
    vatAmount: Math.floor((amount * 10) / 110),
    amountLimit: amount,
    periodStart: "2027-01-09T00:00:00+09:00",
    periodEnd: "2027-02-09T00:00:00+09:00",
    nextChargeAt: "2027-02-09T00:00:00+09:00",
    firstBillingScheduledAt: "2027-01-09T00:00:00+09:00",
    autoRenewal: true,
    cancellationTerms:
      "해지는 구독 설정에서 언제든 예약할 수 있고 현재 이용 기간이 끝나면 다음 결제가 되지 않습니다.",
    refundTerms: "환불 기준은 환불정책을 따릅니다.",
  };
}

function invoiceDetail(invoiceId: number): InvoiceDetail | null {
  const item = billingState.invoices.find((invoice) => invoice.invoiceId === invoiceId);
  if (!item) return null;
  return {
    ...item,
    nextRetryAt: null,
    supplyAmount: Math.round(item.amount / 1.1),
    vatAmount: item.amount - Math.round(item.amount / 1.1),
    vatRateBp: 1000,
    attempts: [
      {
        pgOrderId: `order-${invoiceId}-1`,
        pgTransactionId: "txn-1",
        result: item.status === "FAILED" ? "FAILED" : "SUCCESS",
        failureCategory: item.status === "FAILED" ? "CARD_UNUSABLE" : null,
        attemptedAt: item.periodStart,
      },
    ],
    supplier: {
      businessName: "사이로(SAIRO)",
      representativeName: "김태환",
      businessNumber: "000-00-00000",
      address: "서울특별시 예시구 예시로 1",
      infoVersion: 1,
    },
    taxDocuments: [],
  };
}

function refundStatus(refundId: number): RefundStatus | null {
  const item = billingState.refunds.find((refund) => refund.refundId === refundId);
  if (!item) return null;
  return {
    ...item,
    entitlementAmount: item.refundAmount ?? null,
    previousRefundAmount: 0,
    reservedAmount: 0,
    rejectionReason: item.status === "REJECTED" ? "환불 대상 기간이 아닙니다." : null,
    failureReason: item.status === "FAILED" ? "결제사 취소 요청이 실패했습니다." : null,
    calculation: {
      originalApprovedAmount: 59900,
      totalPeriodSeconds: 2592000,
      remainingPeriodSeconds: 1296000,
      couponExcludedAmount: 0,
      priorCompensationAmount: 0,
      effectiveEndAt: "2026-10-11T09:00:00+09:00",
    },
  };
}

function pageOf<T>(items: T[], url: URL) {
  const size = Number(url.searchParams.get("size") ?? 20);
  const page = Number(url.searchParams.get("page") ?? 0);
  return {
    items: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
  };
}

export const billingHandlers = [
  http.get("/api/public/pricing", () => HttpResponse.json(MOCK_PUBLIC_PRICING)),
  http.get("/api/public/company-info", () =>
    errorResponse(404, "COMPANY_INFO_NOT_PUBLISHED", "게시된 회사 정보가 없습니다."),
  ),
  http.get("/api/billing/plans", () => HttpResponse.json(plans())),
  http.get("/api/subscriptions/current", () => HttpResponse.json(billingState.subscription)),
  http.get("/api/terms", ({ request }) => {
    const context = new URL(request.url).searchParams.get("context");
    if (context !== "CARD_REGISTRATION") return undefined;
    return HttpResponse.json({
      items: [
        {
          termsCode: "CARD_REGISTRATION",
          version: "1.0",
          required: true,
          title: "카드 등록 안내",
          documentUrl: "/billing/card",
          category: "SEPARATE_CONSENT",
          reconsentRequired: false,
          changeSummary: null,
        },
      ],
    });
  }),
  http.post("/api/subscriptions/billing-key/session", () => {
    billingState.sessionIssued = true;
    return HttpResponse.json({
      customerKey: "customer-key-0001",
      expiresAt: "2026-11-10T09:30:00+09:00",
    });
  }),
  http.post("/api/subscriptions/billing-key", async ({ request }) => {
    const body = (await request.json()) as { authKey?: string; customerKey?: string };
    if (body.authKey === "bad-auth") {
      return errorResponse(402, "BILLING_KEY_ISSUE_FAILED", "카드 등록에 실패했습니다.");
    }
    if (body.customerKey !== "customer-key-0001")
      return mockErrors.validation([{ field: "customerKey", message: "일치하지 않습니다." }]);
    billingState.subscription = {
      ...billingState.subscription,
      paymentMethod: { cardIssuer: "신한카드", cardLast4: "1234", registeredAt: NOW },
      readiness: { ...billingState.subscription.readiness, hasBillingKey: true },
    };
    return HttpResponse.json({
      registered: true,
      registeredAt: NOW,
      firstBillingScheduledAt: billingState.subscription.firstBillingScheduledAt ?? null,
    });
  }),
  http.delete("/api/subscriptions/billing-key", () => {
    billingState.subscription = {
      ...billingState.subscription,
      paymentMethod: null,
      readiness: { ...billingState.subscription.readiness, hasBillingKey: false },
    };
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("/api/subscriptions/purchase-consent/preview", ({ request }) => {
    const noticeId = new URL(request.url).searchParams.get("priceChangeNoticeId");
    return HttpResponse.json(preview(noticeId ? Number(noticeId) : null));
  }),
  http.post("/api/subscriptions/purchase-consent", async ({ request }) => {
    const body = (await request.json()) as {
      totalAmountInclVat: number;
      amountLimit: number;
      termsVersion: string;
    };
    billingState.subscription = {
      ...billingState.subscription,
      readiness: { ...billingState.subscription.readiness, hasValidConsent: true },
    };
    return HttpResponse.json({
      termsVersion: body.termsVersion,
      totalAmountInclVat: body.totalAmountInclVat,
      vatAmount: Math.floor((body.totalAmountInclVat * 10) / 110),
      amountLimit: body.amountLimit,
      agreedAt: NOW,
    });
  }),
  http.post("/api/subscriptions/first-payment", () => {
    billingState.subscription = { ...billingState.subscription, status: "ACTIVE" };
    return HttpResponse.json({ status: "ACTIVE" });
  }),
  http.post("/api/subscriptions/retry-payment", () => {
    billingState.subscription = {
      ...billingState.subscription,
      status: "ACTIVE",
      canRetryPayment: false,
    };
    return HttpResponse.json({ status: "ACTIVE" });
  }),
  http.post("/api/subscriptions/cancel", () => {
    const effectiveAt = billingState.subscription.currentPeriodEnd;
    billingState.subscription = {
      ...billingState.subscription,
      cancellationEffectiveAt: effectiveAt,
    };
    return HttpResponse.json({ effectiveAt, revokedAt: null });
  }),
  http.post("/api/subscriptions/cancel/withdraw", () => {
    billingState.subscription = { ...billingState.subscription, cancellationEffectiveAt: null };
    return HttpResponse.json({ withdrawn: true, revokedAt: NOW });
  }),
  http.get("/api/billing/invoices", ({ request }) =>
    HttpResponse.json(pageOf(billingState.invoices, new URL(request.url))),
  ),
  http.get("/api/billing/invoices/:invoiceId", ({ params }) => {
    const detail = invoiceDetail(Number(params.invoiceId));
    return detail ? HttpResponse.json(detail) : mockErrors.notFound();
  }),
  http.post("/api/refund-requests", async ({ request }) => {
    const body = (await request.json()) as { invoiceId: number; reasonCode: string };
    const invoice = billingState.invoices.find((item) => item.invoiceId === body.invoiceId);
    if (!invoice) return mockErrors.notFound();
    if (invoice.refundableAmount <= 0) {
      return errorResponse(409, "INVALID_TRANSITION", "환불할 수 없는 청구서입니다.");
    }
    const existing = billingState.refunds.find(
      (item) => item.invoiceId === body.invoiceId && item.reasonCode === body.reasonCode,
    );
    if (existing)
      return HttpResponse.json({ refundId: existing.refundId, status: existing.status });
    billingState.nextRefundId += 1;
    const created = {
      refundId: billingState.nextRefundId,
      invoiceId: body.invoiceId,
      status: "RECEIVED",
      reasonCode: body.reasonCode,
      refundAmount: null,
      createdAt: NOW,
    };
    billingState.refunds = [created, ...billingState.refunds];
    return HttpResponse.json(
      { refundId: created.refundId, status: created.status },
      { status: 201 },
    );
  }),
  http.get("/api/refund-requests", ({ request }) =>
    HttpResponse.json(pageOf(billingState.refunds, new URL(request.url))),
  ),
  http.get("/api/refund-requests/:refundId", ({ params }) => {
    const detail = refundStatus(Number(params.refundId));
    return detail ? HttpResponse.json(detail) : mockErrors.notFound();
  }),
  http.get("/api/subscriptions/start-customer-agreement", () =>
    billingState.agreement ? HttpResponse.json(billingState.agreement) : mockErrors.notFound(),
  ),
  http.post("/api/subscriptions/start-customer-agreement/acknowledge", () => {
    if (!billingState.agreement) return mockErrors.notFound();
    billingState.agreement = {
      ...billingState.agreement,
      ownerAcknowledgedAt: billingState.agreement.ownerAcknowledgedAt ?? NOW,
    };
    return HttpResponse.json(billingState.agreement);
  }),
  http.get("/api/subscriptions/price-change-notices", ({ request }) =>
    HttpResponse.json(pageOf(billingState.notices, new URL(request.url))),
  ),
  http.post("/api/subscriptions/price-change-notices/:noticeId/decline", ({ params }) => {
    const notice = billingState.notices.find((item) => item.noticeId === Number(params.noticeId));
    if (!notice) return mockErrors.notFound();
    if (notice.decision !== "PENDING" || !notice.consentRequired) {
      return errorResponse(409, "PRICE_CHANGE_NOTICE_CLOSED", "이미 처리된 안내입니다.");
    }
    billingState.notices = billingState.notices.map((item) =>
      item.noticeId === notice.noticeId ? { ...item, decision: "DECLINED", decidedAt: NOW } : item,
    );
    return HttpResponse.json({
      noticeId: notice.noticeId,
      decision: "DECLINED",
      decidedAt: NOW,
      subscriptionEndsAt: notice.appliesFromPeriodStart,
    });
  }),
  http.get("/api/billing/tax-recipient", () => HttpResponse.json(billingState.taxRecipient)),
  http.put("/api/billing/tax-recipient", async ({ request }) => {
    const body = (await request.json()) as Partial<TaxRecipient>;
    if (!/^\d{10}$/.test(body.businessNumber ?? "")) {
      return errorResponse(
        422,
        "TAX_RECIPIENT_INVALID",
        "사업자등록번호 형식이 올바르지 않습니다.",
      );
    }
    billingState.taxRecipient = {
      ...billingState.taxRecipient,
      ...body,
      registered: true,
      recipientId: 5,
      registeredAt: NOW,
    } as TaxRecipient;
    return HttpResponse.json(billingState.taxRecipient);
  }),
  http.get("/api/offices/current/auth-status", () =>
    HttpResponse.json(billingState.authSuspension),
  ),
  http.post("/api/grant-auth/:kind", async ({ request, params }) => {
    const body = (await request.json()) as {
      grantId: number;
      authMethod: string;
      credential: string;
    };
    if (body.grantId === 404) {
      const code = params.kind === "return" ? "RETURN_GRANT_INVALID" : "ARCHIVE_GRANT_INVALID";
      return errorResponse(403, code, "권한이 유효하지 않습니다.");
    }
    if (body.authMethod === "KAKAO" && body.credential === "other-account") {
      return errorResponse(403, "STEP_UP_ACCOUNT_MISMATCH", "다른 계정입니다.");
    }
    if (body.authMethod === "EMAIL" && body.credential !== "correct-pw")
      return mockErrors.invalidCredentials();
    billingState.grant.signedIn = true;
    return HttpResponse.json({
      grantId: body.grantId,
      grantType: String(params.kind).toUpperCase(),
      expiresAt: "2027-12-31T00:00:00+09:00",
    });
  }),
  http.get("/api/return-grants/current", () => {
    if (!billingState.grant.signedIn) return mockErrors.unauthenticated();
    return HttpResponse.json({
      grantId: 12,
      expiresAt: "2027-12-31T00:00:00+09:00",
      revoked: billingState.grant.revoked,
    });
  }),
  http.post("/api/return-grants/:grantId/export", () => {
    billingState.grant.exportPolls = 0;
    return HttpResponse.json({
      exportId: 77,
      status: "PROCESSING",
      downloadUrl: null,
      expiresAt: null,
      fileExpiresAt: null,
    });
  }),
  http.get("/api/return-grants/:grantId/exports/:exportId", () => {
    billingState.grant.exportPolls += 1;
    if (billingState.grant.exportPolls < 2) {
      return HttpResponse.json({
        exportId: 77,
        status: "PROCESSING",
        downloadUrl: null,
        expiresAt: null,
        fileExpiresAt: null,
      });
    }
    return HttpResponse.json({
      exportId: 77,
      status: "COMPLETED",
      downloadUrl: "https://files.example.com/export-77.zip",
      expiresAt: "2026-11-10T09:10:00+09:00",
      fileExpiresAt: "2026-11-11T09:00:00+09:00",
    });
  }),
  http.get("/api/archive-grants/current", () => {
    if (!billingState.grant.signedIn) return mockErrors.unauthenticated();
    return HttpResponse.json({ grantId: 13, expiresAt: null, revoked: billingState.grant.revoked });
  }),
];
