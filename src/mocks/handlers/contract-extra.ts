import { http, HttpResponse } from "msw";
import type {
  ContractDetailResponse,
  ContractFeeListResponse,
  ContractFollowupTaskListResponse,
  ContractPaymentScheduleListResponse,
} from "@/lib/api/contracts/contract.schema";
import { errorResponse, mockErrors } from "../error-responses";
import { getMockContractState } from "./contract";
import type { MockContract } from "./contract";

const NOW = "2026-11-10T09:00:00+09:00";

export type MockFee = ContractFeeListResponse["items"][number];
export type MockSchedule = ContractPaymentScheduleListResponse["items"][number];
export type MockFollowup = ContractFollowupTaskListResponse["items"][number];
type MockDocument = ContractDetailResponse["documents"][number];

export type ContractExtraState = {
  fees: Record<number, MockFee[]>;
  schedules: Record<number, MockSchedule[]>;
  amountMismatchReason: Record<number, string | null>;
  followups: Record<number, MockFollowup[]>;
  nextId: number;
};

function initialState(): ContractExtraState {
  return { fees: {}, schedules: {}, amountMismatchReason: {}, followups: {}, nextId: 50000 };
}

let state = initialState();

export function resetMockContractExtraState(): void {
  state = initialState();
}

export function getMockContractExtraState(): ContractExtraState {
  return state;
}

export function buildMockFee(partial: Partial<MockFee> & Pick<MockFee, "feeId">): MockFee {
  return {
    payerType: "SELLER_LANDLORD",
    payerPartyId: 910101,
    payerName: "박임대",
    agreedFeeAmount: 1_000_000,
    vatIncluded: true,
    supplyAmount: 909_091,
    taxAmount: 90_909,
    totalAmount: 1_000_000,
    billedAt: NOW,
    dueAt: null,
    netReceivedAmount: 0,
    revisions: [
      {
        revisionId: partial.feeId * 10 + 1,
        revisionType: "INITIAL",
        effectiveDate: "2026-11-10",
        totalAmount: 1_000_000,
        reason: null,
        supersedesRevisionId: null,
        isSuperseded: false,
      },
    ],
    transactions: [],
    officeId: 12,
    version: 1,
    ...partial,
  };
}

export function buildMockSchedule(
  partial: Partial<MockSchedule> & Pick<MockSchedule, "scheduleId">,
): MockSchedule {
  return {
    installmentType: "DEPOSIT",
    sequenceNo: 1,
    scheduledDate: "2026-11-20",
    scheduledAmount: 30_000_000,
    actualPaidTotal: 0,
    paymentStatus: "UNPAID",
    transactions: [],
    officeId: 12,
    version: 1,
    ...partial,
  };
}

function contractOf(id: string | readonly string[] | undefined): MockContract | undefined {
  return getMockContractState().contracts.find(
    (item) => String(item.detail.contractId) === String(id),
  );
}

function deputy() {
  return getMockContractState().callerRole === "DEPUTY" ? mockErrors.forbidden() : null;
}

function versionProblem(request: Request, version: number) {
  const header = request.headers.get("If-Match");
  if (header === null || Number.isNaN(Number(header))) {
    return mockErrors.validation([{ field: "If-Match", message: "버전이 필요합니다." }]);
  }
  return Number(header) === version ? null : mockErrors.versionConflict(version);
}

function netReceived(fee: MockFee): number {
  return fee.transactions
    .filter((item) => !item.isSuperseded)
    .reduce(
      (sum, item) => (item.transactionType === "REFUND" ? sum - item.amount : sum + item.amount),
      0,
    );
}

function payerSummary(fees: MockFee[]): ContractFeeListResponse["payers"] {
  const map = new Map<number, ContractFeeListResponse["payers"][number]>();
  for (const fee of fees) {
    const entry = map.get(fee.payerPartyId) ?? {
      payerPartyId: fee.payerPartyId,
      payerName: fee.payerName,
      payerType: fee.payerType,
      billedTotal: 0,
      netReceivedTotal: 0,
      outstandingAmount: 0,
      overcollectedAmount: 0,
    };
    entry.billedTotal += fee.totalAmount;
    entry.netReceivedTotal += fee.netReceivedAmount;
    map.set(fee.payerPartyId, entry);
  }
  return [...map.values()].map((entry) => ({
    ...entry,
    outstandingAmount: Math.max(0, entry.billedTotal - entry.netReceivedTotal),
    overcollectedAmount: Math.max(0, entry.netReceivedTotal - entry.billedTotal),
  }));
}

function updateFee(contractId: number, feeId: number, update: (fee: MockFee) => MockFee) {
  state.fees = {
    ...state.fees,
    [contractId]: (state.fees[contractId] ?? []).map((fee) =>
      fee.feeId === feeId ? update(fee) : fee,
    ),
  };
}

function findFee(feeId: string | readonly string[] | undefined) {
  for (const [contractId, fees] of Object.entries(state.fees)) {
    const fee = fees.find((item) => String(item.feeId) === String(feeId));
    if (fee) return { contractId: Number(contractId), fee };
  }
  return null;
}

function findSchedule(scheduleId: string | readonly string[] | undefined) {
  for (const [contractId, items] of Object.entries(state.schedules)) {
    const schedule = items.find((item) => String(item.scheduleId) === String(scheduleId));
    if (schedule) return { contractId: Number(contractId), schedule };
  }
  return null;
}

async function readForm(
  request: Request,
  defaults: Record<string, FormDataEntryValue>,
): Promise<Record<string, FormDataEntryValue>> {
  try {
    const form = await request.formData();
    const parsed = Object.fromEntries(form.entries());
    return "contractRevisionId" in parsed ? parsed : { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function replaceDocuments(contract: MockContract, documents: MockDocument[]) {
  const mock = getMockContractState();
  mock.contracts = mock.contracts.map((item) =>
    item === contract
      ? { ...item, detail: { ...item.detail, documents, version: item.detail.version + 1 } }
      : item,
  );
}

function contractAmount(detail: ContractDetailResponse): number | null {
  return detail.dealType === "SALE" ? (detail.salePrice ?? null) : (detail.depositAmount ?? null);
}

export const contractExtraHandlers = [
  http.get("/api/contracts/:contractId/fees", ({ params }) => {
    const denied = deputy();
    if (denied) return denied;
    if (!contractOf(params.contractId)) return mockErrors.notFound();
    const fees = (state.fees[Number(params.contractId)] ?? []).map((fee) => ({
      ...fee,
      netReceivedAmount: netReceived(fee),
    }));
    return HttpResponse.json({ items: fees, payers: payerSummary(fees) });
  }),

  http.post("/api/contracts/:contractId/fees", async ({ params, request }) => {
    const denied = deputy();
    if (denied) return denied;
    const contract = contractOf(params.contractId);
    if (!contract) return mockErrors.notFound();
    if (contract.detail.contractStatus === "DRAFT") {
      return errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "초안 계약에는 등록할 수 없습니다.");
    }
    const body = (await request.json()) as Record<string, unknown> & {
      payerType: string;
      payerPartyId: number;
      supplyAmount: number;
      taxAmount: number;
      totalAmount: number;
      agreedFeeAmount: number;
      vatIncluded: boolean;
      billedAt: string;
      dueAt?: string | null;
    };
    if (body.totalAmount !== body.supplyAmount + body.taxAmount) {
      return errorResponse(400, "FEE_AMOUNT_MISMATCH", "합계가 맞지 않습니다.", {
        fieldErrors: [{ field: "totalAmount", message: "합계가 공급가액과 세액의 합과 다릅니다." }],
      });
    }
    const side =
      body.payerType === "SELLER_LANDLORD"
        ? contract.detail.sellerLandlordParties
        : contract.detail.buyerTenantParties;
    const party = side.find((item) => item.partyId === body.payerPartyId);
    if (!party)
      return errorResponse(400, "INVALID_CONTRACT_PARTY", "지급의무자가 올바르지 않습니다.");
    const feeId = state.nextId++;
    const fee = buildMockFee({
      feeId,
      payerType: body.payerType,
      payerPartyId: party.partyId,
      payerName: party.name,
      agreedFeeAmount: body.agreedFeeAmount,
      vatIncluded: body.vatIncluded,
      supplyAmount: body.supplyAmount,
      taxAmount: body.taxAmount,
      totalAmount: body.totalAmount,
      billedAt: body.billedAt,
      dueAt: body.dueAt ?? null,
    });
    state.fees = {
      ...state.fees,
      [contract.detail.contractId]: [...(state.fees[contract.detail.contractId] ?? []), fee],
    };
    return HttpResponse.json(
      {
        feeId,
        contractId: contract.detail.contractId,
        payerPartyId: party.partyId,
        totalAmount: fee.totalAmount,
        officeId: 12,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.post("/api/contract-fees/:feeId/revisions", async ({ params, request }) => {
    const found = findFee(params.feeId);
    if (!found) return mockErrors.notFound();
    const problem = versionProblem(request, found.fee.version);
    if (problem) return problem;
    const body = (await request.json()) as {
      revisionType: string;
      effectiveDate: string;
      totalAmount: number;
      agreedFeeAmount: number;
      supplyAmount: number;
      taxAmount: number;
      reason: string;
      supersedesRevisionId?: number | null;
    };
    if (body.totalAmount !== body.supplyAmount + body.taxAmount) {
      return errorResponse(400, "FEE_AMOUNT_MISMATCH", "합계가 맞지 않습니다.");
    }
    if (body.revisionType === "CORRECTED") {
      const target = found.fee.revisions.find(
        (item) => item.revisionId === body.supersedesRevisionId,
      );
      if (!target)
        return mockErrors.validation([
          { field: "supersedesRevisionId", message: "같은 청구의 기존 사건이어야 합니다." },
        ]);
      if (target.isSuperseded)
        return errorResponse(409, "INVALID_TRANSITION", "이미 대체된 사건입니다.");
    }
    const revisionId = state.nextId++;
    updateFee(found.contractId, found.fee.feeId, (fee) => ({
      ...fee,
      agreedFeeAmount: body.agreedFeeAmount,
      supplyAmount: body.supplyAmount,
      taxAmount: body.taxAmount,
      totalAmount: body.totalAmount,
      version: fee.version + 1,
      revisions: [
        ...fee.revisions.map((item) =>
          item.revisionId === body.supersedesRevisionId ? { ...item, isSuperseded: true } : item,
        ),
        {
          revisionId,
          revisionType: body.revisionType,
          effectiveDate: body.effectiveDate,
          totalAmount: body.totalAmount,
          reason: body.reason,
          supersedesRevisionId: body.supersedesRevisionId ?? null,
          isSuperseded: false,
        },
      ],
    }));
    return HttpResponse.json(
      {
        revisionId,
        feeId: found.fee.feeId,
        revisionType: body.revisionType,
        totalAmount: body.totalAmount,
        officeId: 12,
        version: found.fee.version + 1,
      },
      { status: 201 },
    );
  }),

  http.post("/api/contract-fees/:feeId/transactions", async ({ params, request }) => {
    const found = findFee(params.feeId);
    if (!found) return mockErrors.notFound();
    const problem = versionProblem(request, found.fee.version);
    if (problem) return problem;
    const body = (await request.json()) as {
      transactionType: string;
      amount: number;
      actualDate: string;
      memo?: string | null;
      supersedesTransactionId?: number | null;
      correctionReason?: string | null;
    };
    if (!(body.amount > 0)) {
      return mockErrors.validation([{ field: "amount", message: "금액은 0보다 커야 합니다." }]);
    }
    if (body.supersedesTransactionId) {
      const target = found.fee.transactions.find(
        (item) => item.transactionId === body.supersedesTransactionId,
      );
      if (!target)
        return mockErrors.validation([
          { field: "supersedesTransactionId", message: "같은 청구의 거래여야 합니다." },
        ]);
      if (target.isSuperseded)
        return errorResponse(409, "INVALID_TRANSITION", "이미 정정으로 대체된 거래입니다.");
    }
    if (body.transactionType === "REFUND" && body.amount > netReceived(found.fee)) {
      return mockErrors.validation([{ field: "amount", message: "환급액이 순수납액을 넘습니다." }]);
    }
    const transactionId = state.nextId++;
    updateFee(found.contractId, found.fee.feeId, (fee) => ({
      ...fee,
      version: fee.version + 1,
      transactions: [
        ...fee.transactions.map((item) =>
          item.transactionId === body.supersedesTransactionId
            ? { ...item, isSuperseded: true }
            : item,
        ),
        {
          transactionId,
          transactionType: body.transactionType,
          amount: body.amount,
          actualDate: body.actualDate,
          memo: body.memo ?? null,
          supersedesTransactionId: body.supersedesTransactionId ?? null,
          correctionReason: body.correctionReason ?? null,
          recordedAt: NOW,
          isSuperseded: false,
        },
      ],
    }));
    return HttpResponse.json(
      {
        transactionId,
        feeId: found.fee.feeId,
        transactionType: body.transactionType,
        amount: body.amount,
        actualDate: body.actualDate,
        officeId: 12,
        version: found.fee.version + 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/contracts/:contractId/payment-schedules", ({ params }) => {
    const denied = deputy();
    if (denied) return denied;
    const contract = contractOf(params.contractId);
    if (!contract) return mockErrors.notFound();
    const id = Number(params.contractId);
    const items = state.schedules[id] ?? [];
    const total = items.reduce((sum, item) => sum + item.scheduledAmount, 0);
    const base = contractAmount(contract.detail);
    return HttpResponse.json({
      items,
      scheduledTotal: total,
      contractAmountTotal: base,
      warning: items.length > 0 && base !== null && total !== base ? "AMOUNT_MISMATCH" : null,
      amountMismatchReason: state.amountMismatchReason[id] ?? null,
    });
  }),

  http.post("/api/contracts/:contractId/payment-schedules", async ({ params, request }) => {
    const denied = deputy();
    if (denied) return denied;
    const contract = contractOf(params.contractId);
    if (!contract) return mockErrors.notFound();
    const id = contract.detail.contractId;
    if (contract.detail.contractStatus === "DRAFT") {
      return errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "초안 계약에는 등록할 수 없습니다.");
    }
    const body = (await request.json()) as {
      installmentType: string;
      sequenceNo: number;
      scheduledDate: string;
      scheduledAmount: number;
      amountMismatchReason?: string | null;
    };
    if (!(body.scheduledAmount > 0)) {
      return mockErrors.validation([
        { field: "scheduledAmount", message: "예정액은 0보다 커야 합니다." },
      ]);
    }
    const existing = state.schedules[id] ?? [];
    if (
      existing.some(
        (item) =>
          item.installmentType === body.installmentType && item.sequenceNo === body.sequenceNo,
      )
    ) {
      return errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "같은 종류와 순번이 있습니다.");
    }
    const scheduleId = state.nextId++;
    const created = buildMockSchedule({
      scheduleId,
      installmentType: body.installmentType,
      sequenceNo: body.sequenceNo,
      scheduledDate: body.scheduledDate,
      scheduledAmount: body.scheduledAmount,
    });
    state.schedules = { ...state.schedules, [id]: [...existing, created] };
    if (body.amountMismatchReason) {
      state.amountMismatchReason = {
        ...state.amountMismatchReason,
        [id]: body.amountMismatchReason,
      };
    }
    const total = [...existing, created].reduce((sum, item) => sum + item.scheduledAmount, 0);
    const base = contractAmount(contract.detail);
    return HttpResponse.json(
      {
        scheduleId,
        contractId: id,
        installmentType: body.installmentType,
        scheduledAmount: body.scheduledAmount,
        warning: base !== null && total !== base ? "AMOUNT_MISMATCH" : null,
        officeId: 12,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.post("/api/payment-schedules/:scheduleId/transactions", async ({ params, request }) => {
    const found = findSchedule(params.scheduleId);
    if (!found) return mockErrors.notFound();
    const problem = versionProblem(request, found.schedule.version);
    if (problem) return problem;
    const body = (await request.json()) as {
      actualAmount: number;
      actualDate: string;
      supersedesTransactionId?: number | null;
      correctionReason?: string | null;
    };
    if (!(body.actualAmount > 0)) {
      return mockErrors.validation([
        { field: "actualAmount", message: "금액은 0보다 커야 합니다." },
      ]);
    }
    if (body.supersedesTransactionId) {
      const target = found.schedule.transactions.find(
        (item) => item.transactionId === body.supersedesTransactionId,
      );
      if (!target)
        return mockErrors.validation([
          { field: "supersedesTransactionId", message: "같은 예정의 거래여야 합니다." },
        ]);
      if (target.isSuperseded)
        return errorResponse(409, "INVALID_TRANSITION", "이미 대체된 거래입니다.");
    }
    const transactionId = state.nextId++;
    const transactions = [
      ...found.schedule.transactions.map((item) =>
        item.transactionId === body.supersedesTransactionId
          ? { ...item, isSuperseded: true }
          : item,
      ),
      {
        transactionId,
        actualAmount: body.actualAmount,
        actualDate: body.actualDate,
        confirmedByMembershipId: getMockContractState().callerMembershipId,
        confirmedByMemberName: "이중개",
        confirmedAt: NOW,
        supersedesTransactionId: body.supersedesTransactionId ?? null,
        correctionReason: body.correctionReason ?? null,
        isSuperseded: false,
      },
    ];
    const paid = transactions
      .filter((item) => !item.isSuperseded)
      .reduce((sum, item) => sum + item.actualAmount, 0);
    const status =
      paid === 0 ? "UNPAID" : paid < found.schedule.scheduledAmount ? "PARTIAL" : "PAID";
    state.schedules = {
      ...state.schedules,
      [found.contractId]: (state.schedules[found.contractId] ?? []).map((item) =>
        item.scheduleId === found.schedule.scheduleId
          ? {
              ...item,
              transactions,
              actualPaidTotal: paid,
              paymentStatus: status,
              version: item.version + 1,
            }
          : item,
      ),
    };
    return HttpResponse.json(
      {
        transactionId,
        scheduleId: found.schedule.scheduleId,
        actualAmount: body.actualAmount,
        confirmedByMembershipId: getMockContractState().callerMembershipId,
        confirmedAt: NOW,
        officeId: 12,
        version: found.schedule.version + 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/contracts/:contractId/followup-tasks", ({ params }) => {
    const denied = deputy();
    if (denied) return denied;
    if (!contractOf(params.contractId)) return mockErrors.notFound();
    return HttpResponse.json({ items: state.followups[Number(params.contractId)] ?? [] });
  }),

  http.patch("/api/contract-followup-tasks/:taskId", async ({ params, request }) => {
    for (const [contractId, items] of Object.entries(state.followups)) {
      const found = items.find((item) => String(item.taskId) === params.taskId);
      if (!found) continue;
      const problem = versionProblem(request, found.version);
      if (problem) return problem;
      if (found.submitted) {
        return HttpResponse.json({
          taskId: found.taskId,
          submitted: true,
          submittedAt: found.submittedAt,
          officeId: 12,
          version: found.version,
        });
      }
      const updated = { ...found, submitted: true, submittedAt: NOW, version: found.version + 1 };
      state.followups = {
        ...state.followups,
        [Number(contractId)]: items.map((item) => (item === found ? updated : item)),
      };
      return HttpResponse.json({
        taskId: updated.taskId,
        submitted: true,
        submittedAt: NOW,
        officeId: 12,
        version: updated.version,
      });
    }
    return mockErrors.notFound();
  }),

  http.post("/api/contracts/:contractId/documents", async ({ params, request }) => {
    const denied = deputy();
    if (denied) return denied;
    const contract = contractOf(params.contractId);
    if (!contract) return mockErrors.notFound();
    const missing = ["SALES_CONTRACT", "DISCLOSURE_STATEMENT"].find(
      (type) => !contract.detail.documents.some((item) => item.documentType === type),
    );
    const form = await readForm(request, {
      contractRevisionId: String(contract.detail.currentRevisionId ?? 0),
      documentType: missing ?? "SALES_CONTRACT",
    });
    if (
      contract.detail.contractStatus === "DRAFT" ||
      Number(form.contractRevisionId) !== contract.detail.currentRevisionId
    ) {
      return errorResponse(409, "CONTRACT_REVISION_CONFLICT", "최신 계약 버전이 아닙니다.");
    }
    if (contract.detail.documents.some((item) => item.documentType === form.documentType)) {
      return errorResponse(409, "DOCUMENT_VERSION_CONFLICT", "이미 있는 서류입니다.");
    }
    const created = documentFrom(form, 1, null);
    replaceDocuments(contract, [...contract.detail.documents, created]);
    return HttpResponse.json(
      {
        ...created,
        contractRevisionId: created.contractRevisionId ?? 0,
        officeId: 12,
        version: contract.detail.version + 1,
      },
      { status: 201 },
    );
  }),

  http.post(
    "/api/contracts/:contractId/documents/:documentId/revision",
    async ({ params, request }) => {
      const denied = deputy();
      if (denied) return denied;
      const contract = contractOf(params.contractId);
      if (!contract) return mockErrors.notFound();
      const base = contract.detail.documents.find(
        (item) => String(item.documentId) === params.documentId,
      );
      if (!base) return mockErrors.notFound();
      const form = await readForm(request, {
        contractRevisionId: String(contract.detail.currentRevisionId ?? 0),
      });
      if (Number(form.contractRevisionId) !== contract.detail.currentRevisionId) {
        return errorResponse(409, "CONTRACT_REVISION_CONFLICT", "최신 계약 버전이 아닙니다.");
      }
      const latest = Math.max(
        ...contract.detail.documents
          .filter((item) => item.documentType === base.documentType)
          .map((item) => item.versionNo),
      );
      const created = documentFrom(
        { ...form, documentType: base.documentType },
        latest + 1,
        base.documentId,
      );
      replaceDocuments(contract, [...contract.detail.documents, created]);
      return HttpResponse.json(
        {
          ...created,
          contractRevisionId: created.contractRevisionId ?? 0,
          officeId: 12,
          version: contract.detail.version + 1,
        },
        { status: 201 },
      );
    },
  ),

  http.get("/api/contracts/:contractId/documents/:documentId", ({ params }) => {
    const denied = deputy();
    if (denied) return denied;
    const contract = contractOf(params.contractId);
    const document = contract?.detail.documents.find(
      (item) => String(item.documentId) === params.documentId,
    );
    if (!contract || !document) return mockErrors.notFound();
    return HttpResponse.json({
      documentId: document.documentId,
      downloadUrl: `https://files.example.test/documents/${document.documentId}?signature=mock`,
      expiresAt: "2026-11-10T09:10:00+09:00",
      officeId: 12,
      version: contract.detail.version,
    });
  }),
];

function documentFrom(
  form: Record<string, FormDataEntryValue>,
  versionNo: number,
  supersedes: number | null,
): MockDocument {
  const type = String(form.documentType ?? "SALES_CONTRACT");
  const written =
    typeof form.writtenDate === "string" && form.writtenDate !== "" ? form.writtenDate : null;
  const delivered =
    typeof form.deliveredDate === "string" && form.deliveredDate !== "" ? form.deliveredDate : null;
  const years = type === "SALES_CONTRACT" ? 5 : 3;
  const latest = written && delivered ? (written > delivered ? written : delivered) : null;
  const end = latest ? `${Number(latest.slice(0, 4)) + years}${latest.slice(4)}` : null;
  return {
    documentId: state.nextId++,
    documentType: type,
    versionNo,
    contractRevisionId: Number(form.contractRevisionId) || null,
    writtenDate: written,
    deliveredDate: delivered,
    datePendingReason: typeof form.datePendingReason === "string" ? form.datePendingReason : null,
    retentionYears: years,
    retentionEndDate: end,
    piiMaskingConfirmed: form.piiMaskingConfirmed === "true",
    supersedesDocumentId: supersedes,
  };
}
