import { http, HttpResponse } from "msw";
import type { ContractRevisionList } from "@/features/contract/api/wire";
import type {
  ContractDetailResponse,
  ContractStatusHistoryResponse,
} from "@/lib/api/contracts/contract.schema";
import { errorResponse, mockErrors } from "../error-responses";

const NOW = "2026-11-10T09:00:00+09:00";

export type MockRevision = ContractRevisionList["items"][number];
export type MockHistory = ContractStatusHistoryResponse["items"][number];
export type MockParty = ContractDetailResponse["sellerLandlordParties"][number];
type Snapshot = MockRevision["currentSnapshot"];

export type MockContract = {
  detail: ContractDetailResponse;
  propertyAddress: string;
  managingMembershipId: number;
  managingMemberName: string;
  revisions: MockRevision[];
  history: MockHistory[];
};

export type ContractMockState = {
  callerRole: "OWNER" | "AGENT" | "DEPUTY";
  callerMembershipId: number;
  contracts: MockContract[];
  archivedPropertyIds: number[];
  nextId: number;
  nextPartyId: number;
  nextRevisionId: number;
};

export function buildMockContractDetail(
  partial: Partial<ContractDetailResponse> & Pick<ContractDetailResponse, "contractId">,
): ContractDetailResponse {
  return {
    propertyId: 501,
    dealType: "JEONSE",
    contractStatus: "SIGNED",
    leasePeriodStatus: "IN_PROGRESS",
    settlementStatus: "SCHEDULED",
    signedDate: "2026-10-01",
    depositAmount: 300_000_000,
    monthlyRentAmount: null,
    salePrice: null,
    leaseStartDate: "2026-10-15",
    leaseEndDate: "2028-10-14",
    balanceDueDate: "2026-10-15",
    balanceDueDatePendingReason: null,
    previousContractId: null,
    currentRevisionId: partial.contractId * 10 + 1,
    memo: null,
    documents: [],
    sellerLandlordParties: [
      {
        partyId: partial.contractId * 100 + 1,
        sequenceNo: 1,
        name: "박임대",
        phone: "010-1111-2222",
        customerId: null,
      },
    ],
    buyerTenantParties: [
      {
        partyId: partial.contractId * 100 + 2,
        sequenceNo: 1,
        name: "최임차",
        phone: "010-3333-4444",
        customerId: null,
      },
    ],
    duplicateExcluded: false,
    duplicateOfContractId: null,
    duplicateExcludedAt: null,
    duplicateExclusionReason: null,
    officeId: 12,
    createdAt: NOW,
    updatedAt: NOW,
    version: 1,
    ...partial,
  };
}

function snapshotOf(detail: ContractDetailResponse): Snapshot {
  return {
    signedDate: detail.signedDate ?? null,
    dealType: detail.dealType as Snapshot["dealType"],
    salePrice: detail.salePrice ?? null,
    depositAmount: detail.depositAmount ?? null,
    monthlyRentAmount: detail.monthlyRentAmount ?? null,
    balanceDueDate: detail.balanceDueDate ?? null,
    balanceDueDatePendingReason: detail.balanceDueDatePendingReason ?? null,
    leaseStartDate: detail.leaseStartDate ?? null,
    leaseEndDate: detail.leaseEndDate ?? null,
    sellerLandlordParties: detail.sellerLandlordParties.map((party) => ({ ...party })),
    buyerTenantParties: detail.buyerTenantParties.map((party) => ({ ...party })),
  };
}

export function buildMockContract(
  partial: Partial<ContractDetailResponse> & Pick<ContractDetailResponse, "contractId">,
  extra: Partial<Omit<MockContract, "detail">> = {},
): MockContract {
  const detail = buildMockContractDetail(partial);
  const signed = detail.contractStatus !== "DRAFT";
  return {
    detail,
    propertyAddress: "서울특별시 성북구 정릉로 77",
    managingMembershipId: 2,
    managingMemberName: "이중개",
    revisions: signed
      ? [
          {
            revisionId: detail.currentRevisionId ?? detail.contractId * 10 + 1,
            contractId: detail.contractId,
            revisionNo: 1,
            revisionType: "SIGNED",
            previousSnapshot: null,
            currentSnapshot: snapshotOf(detail),
            effectiveAt: "2026-10-01T00:00:00+09:00",
            recordedAt: NOW,
            recordedByMembershipId: 2,
            reason: null,
            supersedesRevisionId: null,
          },
        ]
      : [],
    history: signed
      ? [
          {
            track: "CONTRACT",
            fromStatus: null,
            toStatus: "SIGNED",
            reason: null,
            changedByMembershipId: 2,
            changedByMemberName: "이중개",
            effectiveAt: "2026-10-01T00:00:00+09:00",
            supersedesHistoryId: null,
            createdAt: NOW,
          },
        ]
      : [],
    ...extra,
  };
}

function initialState(): ContractMockState {
  return {
    callerRole: "OWNER",
    callerMembershipId: 2,
    contracts: [buildMockContract({ contractId: 9101 })],
    archivedPropertyIds: [],
    nextId: 9200,
    nextPartyId: 90000,
    nextRevisionId: 95000,
  };
}

let state = initialState();

export function resetMockContractState(): void {
  state = initialState();
}

export function getMockContractState(): ContractMockState {
  return state;
}

export function setMockContractState(partial: Partial<ContractMockState>): void {
  state = { ...state, ...partial };
}

function find(id: string | readonly string[] | undefined) {
  return state.contracts.find((item) => String(item.detail.contractId) === String(id));
}

function replace(next: MockContract) {
  state.contracts = state.contracts.map((item) =>
    item.detail.contractId === next.detail.contractId ? next : item,
  );
}

function todayKst(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}

function leaseStatusFor(detail: ContractDetailResponse): string | null {
  if (detail.dealType === "SALE") return null;
  const today = todayKst();
  if (detail.leaseEndDate && detail.leaseEndDate < today) return "MATURITY_CONFIRMATION_NEEDED";
  if (detail.leaseStartDate && detail.leaseStartDate <= today) return "IN_PROGRESS";
  return "BEFORE_START";
}

type PartyBody = {
  partyId?: number | null;
  name: string;
  phone?: string | null;
  customerId?: number | null;
};

function toParties(items: PartyBody[] | undefined): MockParty[] {
  return (items ?? []).map((item, index) => ({
    partyId: item.partyId ?? state.nextPartyId++,
    sequenceNo: index + 1,
    name: item.name,
    phone: item.phone ?? null,
    customerId: item.customerId ?? null,
  }));
}

function ifMatchProblem(request: Request, version: number) {
  const header = request.headers.get("If-Match");
  if (header === null || header.trim() === "" || Number.isNaN(Number(header))) {
    return mockErrors.validation([{ field: "If-Match", message: "계약 버전이 필요합니다." }]);
  }
  if (Number(header) !== version) return mockErrors.versionConflict(version);
  return null;
}

function signingProblems(
  detail: ContractDetailResponse,
): Array<{ field: string; message: string }> {
  const problems: Array<{ field: string; message: string }> = [];
  const required = (field: string, message: string) => problems.push({ field, message });
  if (!detail.signedDate) required("signedDate", "체결일이 필요합니다.");
  if (detail.sellerLandlordParties.length === 0)
    required("sellerLandlordParties", "당사자가 필요합니다.");
  if (detail.buyerTenantParties.length === 0)
    required("buyerTenantParties", "당사자가 필요합니다.");
  if (detail.dealType === "SALE" && !detail.salePrice)
    required("salePrice", "매매가가 필요합니다.");
  if (detail.dealType !== "SALE") {
    if (!detail.depositAmount) required("depositAmount", "보증금이 필요합니다.");
    if (!detail.leaseStartDate) required("leaseStartDate", "임대 시작일이 필요합니다.");
    if (!detail.leaseEndDate) required("leaseEndDate", "임대 만기일이 필요합니다.");
  }
  if (!detail.balanceDueDate && !(detail.balanceDueDatePendingReason ?? "").trim()) {
    required("balanceDueDate", "잔금 예정일 또는 미정 사유가 필요합니다.");
  }
  return problems;
}

function overlaps(candidate: ContractDetailResponse): boolean {
  return state.contracts.some(({ detail }) => {
    if (detail.contractId === candidate.contractId) return false;
    if (detail.propertyId !== candidate.propertyId || detail.contractStatus !== "SIGNED")
      return false;
    if (candidate.dealType === "SALE") return detail.dealType === "SALE";
    if (detail.dealType === "SALE") return false;
    return (
      (candidate.leaseStartDate ?? "") <= (detail.leaseEndDate ?? "") &&
      (detail.leaseStartDate ?? "") <= (candidate.leaseEndDate ?? "")
    );
  });
}

function sign(contract: MockContract, memberName = "이중개"): MockContract {
  const detail: ContractDetailResponse = {
    ...contract.detail,
    contractStatus: "SIGNED",
    settlementStatus: contract.detail.balanceDueDate ? "SCHEDULED" : "UNDECIDED",
    version: contract.detail.version + 1,
  };
  detail.leasePeriodStatus = leaseStatusFor(detail);
  const revisionId = state.nextRevisionId++;
  detail.currentRevisionId = revisionId;
  return {
    ...contract,
    detail,
    revisions: [
      {
        revisionId,
        contractId: detail.contractId,
        revisionNo: 1,
        revisionType: "SIGNED",
        previousSnapshot: null,
        currentSnapshot: snapshotOf(detail),
        effectiveAt: `${detail.signedDate}T00:00:00+09:00`,
        recordedAt: NOW,
        recordedByMembershipId: state.callerMembershipId,
        reason: null,
        supersedesRevisionId: null,
      },
    ],
    history: [
      {
        track: "CONTRACT",
        fromStatus: null,
        toStatus: "SIGNED",
        reason: null,
        changedByMembershipId: state.callerMembershipId,
        changedByMemberName: memberName,
        effectiveAt: `${detail.signedDate}T00:00:00+09:00`,
        supersedesHistoryId: null,
        createdAt: NOW,
      },
    ],
  };
}

type Body = Record<string, unknown> & {
  dealType?: string;
  managingMembershipId?: number;
  sellerLandlordParties?: PartyBody[];
  buyerTenantParties?: PartyBody[];
};

function applyBody(base: ContractDetailResponse, body: Body): ContractDetailResponse {
  const next = { ...base } as Record<string, unknown>;
  for (const key of [
    "dealType",
    "signedDate",
    "salePrice",
    "depositAmount",
    "monthlyRentAmount",
    "balanceDueDate",
    "balanceDueDatePendingReason",
    "leaseStartDate",
    "leaseEndDate",
    "memo",
  ]) {
    if (key in body) next[key] = body[key];
  }
  if (body.sellerLandlordParties)
    next.sellerLandlordParties = toParties(body.sellerLandlordParties);
  if (body.buyerTenantParties) next.buyerTenantParties = toParties(body.buyerTenantParties);
  return next as ContractDetailResponse;
}

function sensitive(value: unknown): boolean {
  return typeof value === "string" && /\d{6}-?[1-4]\d{6}/.test(value);
}

function createFrom(propertyId: number, body: Body, status: "DRAFT" | "SIGNED") {
  const id = state.nextId++;
  const detail = applyBody(
    buildMockContractDetail({
      contractId: id,
      propertyId,
      contractStatus: "DRAFT",
      leasePeriodStatus: null,
      settlementStatus: "UNDECIDED",
      signedDate: null,
      depositAmount: null,
      leaseStartDate: null,
      leaseEndDate: null,
      balanceDueDate: null,
      currentRevisionId: null,
      sellerLandlordParties: [],
      buyerTenantParties: [],
    }),
    body,
  );
  const member = body.managingMembershipId ?? state.callerMembershipId;
  let created: MockContract = {
    detail,
    propertyAddress: "서울특별시 성북구 정릉로 77",
    managingMembershipId: member,
    managingMemberName: member === 1 ? "김대표" : "이중개",
    revisions: [],
    history: [],
  };
  if (status === "SIGNED") created = sign(created);
  state.contracts = [...state.contracts, created];
  return created;
}

function forbiddenForDeputy() {
  return state.callerRole === "DEPUTY" ? mockErrors.forbidden() : null;
}

export const contractHandlers = [
  http.get("/api/contracts", ({ request }) => {
    const denied = forbiddenForDeputy();
    if (denied) return denied;
    const url = new URL(request.url);
    const status = url.searchParams.get("contractStatus");
    const address = url.searchParams.get("propertyAddress");
    const party = url.searchParams.get("partyName");
    const includeExcluded = url.searchParams.get("includeExcluded") === "true";
    const within = url.searchParams.get("leaseEndWithinDays");
    const today = todayKst();
    const rows = state.contracts
      .filter(({ detail }) => (includeExcluded ? true : !detail.duplicateExcluded))
      .filter(({ detail }) => (status ? detail.contractStatus === status : true))
      .filter(({ propertyAddress }) => (address ? propertyAddress.includes(address) : true))
      .filter(({ detail }) =>
        party
          ? [...detail.sellerLandlordParties, ...detail.buyerTenantParties].some((item) =>
              item.name.includes(party),
            )
          : true,
      )
      .filter(({ detail }) => {
        if (!within) return true;
        if (
          detail.contractStatus !== "SIGNED" ||
          detail.dealType === "SALE" ||
          !detail.leaseEndDate
        )
          return false;
        const limit = new Date(Date.parse(today) + Number(within) * 86_400_000)
          .toISOString()
          .slice(0, 10);
        return detail.leaseEndDate >= today && detail.leaseEndDate <= limit;
      });
    const size = Number(url.searchParams.get("size") ?? 25);
    const page = Number(url.searchParams.get("page") ?? 0);
    const items = rows.slice(page * size, page * size + size).map((item) => {
      const { detail } = item;
      return {
        contractId: detail.contractId,
        propertyAddress: item.propertyAddress,
        dealType: detail.dealType,
        contractStatus: detail.contractStatus,
        leasePeriodStatus: detail.leasePeriodStatus ?? null,
        settlementStatus: detail.settlementStatus,
        signedDate: detail.signedDate ?? null,
        sellerLandlordName: detail.sellerLandlordParties[0]?.name ?? null,
        sellerLandlordPartyCount: detail.sellerLandlordParties.length,
        buyerTenantName: detail.buyerTenantParties[0]?.name ?? null,
        buyerTenantPartyCount: detail.buyerTenantParties.length,
        excluded: detail.duplicateExcluded,
        leaseEndDate: detail.leaseEndDate ?? null,
        managingMembershipId: item.managingMembershipId,
        managingMemberName: item.managingMemberName,
        missingDocumentTypes:
          detail.contractStatus === "DRAFT"
            ? []
            : ["SALES_CONTRACT", "DISCLOSURE_STATEMENT"].filter(
                (type) => !detail.documents.some((document) => document.documentType === type),
              ),
        officeId: 12,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
        version: detail.version,
      };
    });
    return HttpResponse.json({ items, page, size, totalElements: rows.length });
  }),

  http.post("/api/properties/:propertyId/contracts/drafts", async ({ params, request }) => {
    const denied = forbiddenForDeputy();
    if (denied) return denied;
    const propertyId = Number(params.propertyId);
    if (state.archivedPropertyIds.includes(propertyId)) {
      return errorResponse(409, "PROPERTY_ARCHIVED", "보관된 매물입니다.");
    }
    const body = (await request.json()) as Body;
    if (!body.dealType || !body.managingMembershipId) {
      return mockErrors.validation([{ field: "dealType", message: "필수 값이 빠졌습니다." }]);
    }
    if (sensitive(body.memo)) {
      return errorResponse(400, "SENSITIVE_DATA_DETECTED", "민감한 정보가 감지되었습니다.");
    }
    const created = createFrom(propertyId, body, "DRAFT");
    return HttpResponse.json(
      {
        contractId: created.detail.contractId,
        contractStatus: "DRAFT",
        version: 1,
        officeId: 12,
        createdAt: NOW,
        updatedAt: NOW,
      },
      { status: 201 },
    );
  }),

  http.post("/api/properties/:propertyId/contracts", async ({ params, request }) => {
    const denied = forbiddenForDeputy();
    if (denied) return denied;
    const propertyId = Number(params.propertyId);
    if (state.archivedPropertyIds.includes(propertyId)) {
      return errorResponse(409, "PROPERTY_ARCHIVED", "보관된 매물입니다.");
    }
    const body = (await request.json()) as Body;
    if (sensitive(body.memo)) {
      return errorResponse(400, "SENSITIVE_DATA_DETECTED", "민감한 정보가 감지되었습니다.");
    }
    const draftLike = applyBody(
      buildMockContractDetail({
        contractId: 0,
        propertyId,
        sellerLandlordParties: [],
        buyerTenantParties: [],
        depositAmount: null,
        leaseStartDate: null,
        leaseEndDate: null,
        balanceDueDate: null,
        signedDate: null,
      }),
      body,
    );
    const problems = signingProblems(draftLike);
    if (problems.length > 0) {
      return errorResponse(400, "INCOMPLETE_FOR_SIGNING", "체결 조건이 부족합니다.", {
        fieldErrors: problems,
      });
    }
    if (
      draftLike.leaseStartDate &&
      draftLike.leaseEndDate &&
      draftLike.leaseEndDate < draftLike.leaseStartDate
    ) {
      return mockErrors.validation([
        { field: "leaseEndDate", message: "임대 만기일이 시작일보다 이릅니다." },
      ]);
    }
    if (overlaps(draftLike)) {
      return errorResponse(
        409,
        "PROPERTY_HAS_ACTIVE_CONTRACT",
        "기간이 겹치는 체결 계약이 있습니다.",
      );
    }
    const created = createFrom(propertyId, body, "SIGNED");
    return HttpResponse.json(
      {
        contractId: created.detail.contractId,
        contractStatus: "SIGNED",
        version: created.detail.version,
        officeId: 12,
        createdAt: NOW,
        updatedAt: NOW,
        sellerLandlordParties: created.detail.sellerLandlordParties,
        buyerTenantParties: created.detail.buyerTenantParties,
      },
      { status: 201 },
    );
  }),

  http.get("/api/contracts/:contractId", ({ params }) => {
    const denied = forbiddenForDeputy();
    if (denied) return denied;
    const found = find(params.contractId);
    if (!found) return mockErrors.notFound();
    return HttpResponse.json(found.detail);
  }),

  http.patch("/api/contracts/:contractId/draft", async ({ params, request }) => {
    const found = find(params.contractId);
    if (!found) return mockErrors.notFound();
    const problem = ifMatchProblem(request, found.detail.version);
    if (problem) return problem;
    if (found.detail.contractStatus !== "DRAFT") {
      return errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "초안이 아닙니다.");
    }
    const body = (await request.json()) as Body;
    if (sensitive(body.memo)) {
      return errorResponse(400, "SENSITIVE_DATA_DETECTED", "민감한 정보가 감지되었습니다.");
    }
    const detail = { ...applyBody(found.detail, body), version: found.detail.version + 1 };
    replace({
      ...found,
      detail,
      managingMembershipId: body.managingMembershipId ?? found.managingMembershipId,
    });
    return HttpResponse.json({
      contractId: detail.contractId,
      contractStatus: "DRAFT",
      version: detail.version,
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }),

  http.delete("/api/contracts/:contractId/draft", ({ params }) => {
    const found = find(params.contractId);
    if (!found) return mockErrors.notFound();
    if (found.detail.contractStatus !== "DRAFT") {
      return errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "초안이 아닙니다.");
    }
    state.contracts = state.contracts.filter((item) => item !== found);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/contracts/:contractId/sign", ({ params, request }) => {
    const found = find(params.contractId);
    if (!found) return mockErrors.notFound();
    const problem = ifMatchProblem(request, found.detail.version);
    if (problem) return problem;
    if (found.detail.contractStatus !== "DRAFT") {
      return errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "초안이 아닙니다.");
    }
    const problems = signingProblems(found.detail);
    if (problems.length > 0) {
      return errorResponse(400, "INCOMPLETE_FOR_SIGNING", "체결 조건이 부족합니다.", {
        fieldErrors: problems,
      });
    }
    if (overlaps(found.detail)) {
      return errorResponse(
        409,
        "PROPERTY_HAS_ACTIVE_CONTRACT",
        "기간이 겹치는 체결 계약이 있습니다.",
      );
    }
    const signed = sign(found);
    replace(signed);
    return HttpResponse.json({
      contractId: signed.detail.contractId,
      contractStatus: "SIGNED",
      version: signed.detail.version,
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }),

  http.get("/api/contracts/:contractId/revisions", ({ params }) => {
    const found = find(params.contractId);
    if (!found) return mockErrors.notFound();
    return HttpResponse.json({
      items: found.revisions,
      page: 0,
      size: 100,
      totalElements: found.revisions.length,
    });
  }),

  http.post("/api/contracts/:contractId/corrections", async ({ params, request }) => {
    const found = find(params.contractId);
    if (!found) return mockErrors.notFound();
    const problem = ifMatchProblem(request, found.detail.version);
    if (problem) return problem;
    if (found.detail.contractStatus === "DRAFT") {
      return errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "초안은 정정할 수 없습니다.");
    }
    const body = (await request.json()) as Body & {
      baseRevisionId: number;
      reason: string;
      effectiveAt: string;
    };
    if (body.baseRevisionId !== found.detail.currentRevisionId) {
      return errorResponse(409, "CONTRACT_REVISION_CONFLICT", "최신 버전이 아닙니다.");
    }
    if (!body.reason || body.reason.trim() === "") {
      return mockErrors.validation([{ field: "reason", message: "사유가 필요합니다." }]);
    }
    const currentIds = [
      ...found.detail.sellerLandlordParties,
      ...found.detail.buyerTenantParties,
    ].map((p) => p.partyId);
    const submitted = [...(body.sellerLandlordParties ?? []), ...(body.buyerTenantParties ?? [])]
      .map((p) => p.partyId)
      .filter((id): id is number => typeof id === "number");
    if (
      submitted.some((id) => !currentIds.includes(id)) ||
      new Set(submitted).size !== submitted.length
    ) {
      return errorResponse(400, "INVALID_CONTRACT_PARTY", "당사자 번호가 올바르지 않습니다.");
    }
    const detail = applyBody(found.detail, body);
    if (overlaps(detail)) {
      return errorResponse(
        409,
        "PROPERTY_HAS_ACTIVE_CONTRACT",
        "기간이 겹치는 체결 계약이 있습니다.",
      );
    }
    detail.version = found.detail.version + 1;
    detail.leasePeriodStatus =
      found.detail.contractStatus === "SIGNED" ? leaseStatusFor(detail) : detail.leasePeriodStatus;
    const revisionId = state.nextRevisionId++;
    detail.currentRevisionId = revisionId;
    const revision: MockRevision = {
      revisionId,
      contractId: detail.contractId,
      revisionNo: found.revisions.length + 1,
      revisionType: "CORRECTED",
      previousSnapshot: snapshotOf(found.detail),
      currentSnapshot: snapshotOf(detail),
      effectiveAt: body.effectiveAt,
      recordedAt: NOW,
      recordedByMembershipId: state.callerMembershipId,
      reason: body.reason,
      supersedesRevisionId: body.baseRevisionId,
    };
    replace({ ...found, detail, revisions: [...found.revisions, revision] });
    return HttpResponse.json(
      { ...revision, version: detail.version, officeId: 12 },
      { status: 201 },
    );
  }),

  http.patch("/api/contracts/:contractId/status", async ({ params, request }) => {
    const found = find(params.contractId);
    if (!found) return mockErrors.notFound();
    const problem = ifMatchProblem(request, found.detail.version);
    if (problem) return problem;
    const body = (await request.json()) as {
      toStatus: string;
      reason: string;
      effectiveAt: string;
      previousStatus?: string;
    };
    if (found.detail.contractStatus === "DRAFT") {
      return errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "초안은 상태를 바꿀 수 없습니다.");
    }
    if (body.toStatus === "TERMINATED" && found.detail.dealType === "SALE") {
      return errorResponse(409, "SALE_CANNOT_TERMINATE", "매매는 해제할 수 없습니다.");
    }
    if (!body.reason || !body.effectiveAt) {
      return mockErrors.validation([{ field: "reason", message: "사유와 효력시각이 필요합니다." }]);
    }
    if (body.toStatus === "VOID" && !body.previousStatus) {
      return mockErrors.validation([
        { field: "previousStatus", message: "이전 상태가 필요합니다." },
      ]);
    }
    const detail = {
      ...found.detail,
      contractStatus: body.toStatus,
      version: found.detail.version + 1,
    };
    replace({
      ...found,
      detail,
      history: [
        ...found.history,
        {
          track: "CONTRACT",
          fromStatus: found.detail.contractStatus,
          toStatus: body.toStatus,
          reason: body.reason,
          changedByMembershipId: state.callerMembershipId,
          changedByMemberName: "이중개",
          effectiveAt: body.effectiveAt,
          supersedesHistoryId: null,
          createdAt: NOW,
        },
      ],
    });
    return HttpResponse.json({
      contractId: detail.contractId,
      contractStatus: detail.contractStatus,
      version: detail.version,
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }),

  http.patch("/api/contracts/:contractId/settlement-status", async ({ params, request }) => {
    const found = find(params.contractId);
    if (!found) return mockErrors.notFound();
    const problem = ifMatchProblem(request, found.detail.version);
    if (problem) return problem;
    if (found.detail.contractStatus === "DRAFT") {
      return errorResponse(
        409,
        "CONTRACT_ACTION_NOT_ALLOWED",
        "초안은 잔금 상태를 바꿀 수 없습니다.",
      );
    }
    const body = (await request.json()) as {
      toStatus: string;
      reason?: string | null;
      effectiveAt?: string | null;
    };
    const detail = {
      ...found.detail,
      settlementStatus: body.toStatus,
      version: found.detail.version + 1,
    };
    replace({
      ...found,
      detail,
      history: [
        ...found.history,
        {
          track: "SETTLEMENT",
          fromStatus: found.detail.settlementStatus,
          toStatus: body.toStatus,
          reason: body.reason ?? null,
          changedByMembershipId: state.callerMembershipId,
          changedByMemberName: "이중개",
          effectiveAt: body.effectiveAt ?? NOW,
          supersedesHistoryId: null,
          createdAt: NOW,
        },
      ],
    });
    return HttpResponse.json({
      contractId: detail.contractId,
      settlementStatus: detail.settlementStatus,
      version: detail.version,
      officeId: 12,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }),

  http.get("/api/contracts/:contractId/status-history", ({ params, request }) => {
    const found = find(params.contractId);
    if (!found) return mockErrors.notFound();
    const url = new URL(request.url);
    const size = Number(url.searchParams.get("size") ?? 25);
    const page = Number(url.searchParams.get("page") ?? 0);
    return HttpResponse.json({
      items: found.history.slice(page * size, page * size + size),
      page,
      size,
      totalElements: found.history.length,
    });
  }),

  http.post("/api/contracts/:contractId/duplicate-exclusion", async ({ params, request }) => {
    if (state.callerRole !== "OWNER") return mockErrors.forbidden();
    const found = find(params.contractId);
    if (!found) return mockErrors.notFound();
    const problem = ifMatchProblem(request, found.detail.version);
    if (problem) return problem;
    const body = (await request.json()) as { duplicateOfContractId: number; reason: string };
    if (!state.contracts.some((item) => item.detail.contractId === body.duplicateOfContractId)) {
      return mockErrors.validation([
        { field: "duplicateOfContractId", message: "같은 사무소의 다른 계약이어야 합니다." },
      ]);
    }
    if (found.detail.contractStatus === "DRAFT" || found.detail.duplicateExcluded) {
      return errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "중복 제외할 수 없는 계약입니다.");
    }
    const detail = {
      ...found.detail,
      duplicateExcluded: true,
      duplicateOfContractId: body.duplicateOfContractId,
      duplicateExcludedAt: NOW,
      duplicateExclusionReason: body.reason,
      version: found.detail.version + 1,
    };
    replace({ ...found, detail });
    return HttpResponse.json({
      contractId: detail.contractId,
      duplicateOfContractId: body.duplicateOfContractId,
      excludedAt: NOW,
      officeId: 12,
      version: detail.version,
    });
  }),

  http.post("/api/contracts/:contractId/renew", async ({ params, request }) => {
    const found = find(params.contractId);
    if (!found) return mockErrors.notFound();
    if (found.detail.dealType === "SALE" || found.detail.contractStatus === "DRAFT") {
      return errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "재계약할 수 없는 계약입니다.");
    }
    const body = (await request.json()) as Body;
    const candidate = applyBody(
      buildMockContractDetail({
        contractId: 0,
        propertyId: found.detail.propertyId,
        sellerLandlordParties: [],
        buyerTenantParties: [],
        depositAmount: null,
        leaseStartDate: null,
        leaseEndDate: null,
        balanceDueDate: null,
        signedDate: null,
      }),
      body,
    );
    const problems = signingProblems(candidate);
    if (problems.length > 0) {
      return errorResponse(400, "INCOMPLETE_FOR_SIGNING", "체결 조건이 부족합니다.", {
        fieldErrors: problems,
      });
    }
    if (overlaps(candidate)) {
      return errorResponse(
        409,
        "PROPERTY_HAS_ACTIVE_CONTRACT",
        "기간이 겹치는 체결 계약이 있습니다.",
      );
    }
    const created = createFrom(found.detail.propertyId, body, "SIGNED");
    replace({
      ...created,
      detail: { ...created.detail, previousContractId: found.detail.contractId },
    });
    return HttpResponse.json(
      {
        contractId: created.detail.contractId,
        contractStatus: "SIGNED",
        previousContractId: found.detail.contractId,
        officeId: 12,
        createdAt: NOW,
        updatedAt: NOW,
        version: created.detail.version,
      },
      { status: 201 },
    );
  }),
];
