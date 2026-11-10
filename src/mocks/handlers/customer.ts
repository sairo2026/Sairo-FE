import { http, HttpResponse } from "msw";
import type {
  CustomerConsultationListResponse,
  CustomerDetailResponse,
  CustomerListResponse,
} from "@/lib/api/contracts/customer.schema";
import { errorResponse, mockErrors } from "../error-responses";

const NOW = "2026-11-10T09:00:00+09:00";

type ConsultationItem = CustomerConsultationListResponse["items"][number];
type RevisionItem = {
  previousConsultationType: "FIRST_INQUIRY" | "FOLLOWUP";
  previousContent: string;
  previousOccurredAt: string;
  correctedBy: string;
  correctedAt: string;
  correctionReason: string;
};

export type CustomerMockState = {
  customers: CustomerDetailResponse[];
  consultations: Array<ConsultationItem & { customerId: number }>;
  revisions: Record<number, RevisionItem[]>;
  nextId: number;
};

export function buildMockCustomer(
  partial: Partial<CustomerDetailResponse> & Pick<CustomerDetailResponse, "customerId" | "name">,
): CustomerDetailResponse {
  return {
    consultations: [],
    currentOwnedOccupied: [],
    pastContracts: [],
    relatedProperties: [],
    tasks: [],
    upcomingContracts: [],
    visits: [],
    isCorporation: false,
    managingMembershipId: 2,
    phone: "010-1234-5678",
    secondaryPhone: null,
    email: null,
    memo: null,
    dataSource: "방문상담",
    processingBasis: "CONSENT",
    dataPurpose: "매물 상담 및 계약 관리",
    retentionUntil: "2029-11-10",
    deletedAt: null,
    roles: ["DEMAND"],
    deletable: false,
    status: "ACTIVE",
    mergedIntoCustomerId: null,
    demandConditions: [],
    createdAt: NOW,
    updatedAt: NOW,
    officeId: 12,
    version: 1,
    ...partial,
  };
}

function initialState(): CustomerMockState {
  const consultation = (
    id: number,
    customerId: number,
    type: "FIRST_INQUIRY" | "FOLLOWUP",
    content: string,
    revisionCount = 0,
  ) => ({
    consultationId: id,
    customerId,
    consultationType: type,
    occurredAt: "2026-11-01T14:00:00+09:00",
    content,
    authorMembershipId: 2,
    authorName: "이중개",
    revisionCount,
    officeId: 12,
    version: 1,
  });
  const detailConsultation = (item: ReturnType<typeof consultation>) => ({
    consultationId: item.consultationId,
    consultationType: item.consultationType,
    occurredAt: item.occurredAt,
    content: item.content,
    authorMembershipId: item.authorMembershipId,
    authorName: item.authorName,
    revisionCount: item.revisionCount,
  });
  const c1 = consultation(1, 301, "FIRST_INQUIRY", "역세권 원룸을 찾는다고 문의했다.", 1);
  const c2 = consultation(2, 301, "FOLLOWUP", "예산을 다시 확인했다.");
  const c3 = consultation(3, 302, "FIRST_INQUIRY", "전세 문의");
  return {
    customers: [
      buildMockCustomer({
        customerId: 301,
        name: "김수요",
        roles: ["DEMAND", "OWNER"],
        consultations: [detailConsultation(c1), detailConsultation(c2)],
        relatedProperties: [
          {
            propertyId: 501,
            propertyName: "국민대 앞 아파트",
            role: "OWNER",
            startDate: "2024-01-01",
            endDate: null,
            linkId: 41,
            interestId: null,
            note: null,
          },
          {
            propertyId: 502,
            propertyName: "정릉 상가",
            role: "INTEREST",
            startDate: "2026-10-01",
            endDate: null,
            linkId: null,
            interestId: 61,
            note: "가격 협의 가능",
          },
        ],
        demandConditions: [
          {
            conditionId: 81,
            dealType: "MONTHLY",
            categoryId: 6,
            priceMin: null,
            priceMax: null,
            depositMin: 10_000_000,
            depositMax: 30_000_000,
            rentMin: null,
            rentMax: 1_000_000,
            areaMin: 40,
            areaMax: 80,
            moveInDate: "2026-12-01",
            regions: [{ regionId: 1, regionName: "성북구" }],
            version: 1,
          },
        ],
        upcomingContracts: [
          {
            contractId: 7,
            propertyId: 501,
            propertyName: "국민대 앞 아파트",
            dealType: "JEONSE",
            contractStatus: "DRAFT",
            signedDate: "2026-12-01",
            leaseStartDate: null,
            leaseEndDate: null,
          },
        ],
        visits: [
          {
            coordinationId: 9,
            status: "CONFIRMED",
            periodStartDate: "2026-11-12",
            periodEndDate: "2026-11-14",
            candidatePropertyCount: 3,
          },
        ],
        tasks: [{ taskId: 4, title: "계약서 초안 확인", dueDate: "2026-11-15", status: "TODO" }],
        createdAt: "2026-10-01T09:00:00+09:00",
      }),
      buildMockCustomer({
        customerId: 302,
        name: "김수요",
        phone: "010-1234-5678",
        memo: "중복 등록",
        managingMembershipId: 1,
        consultations: [detailConsultation(c3)],
        createdAt: "2026-10-05T09:00:00+09:00",
        deletable: true,
      }),
      buildMockCustomer({
        customerId: 303,
        name: "박법인",
        isCorporation: true,
        roles: ["OWNER"],
        phone: "02-123-4567",
        createdAt: "2026-10-06T09:00:00+09:00",
      }),
    ],
    consultations: [c1, c2, c3],
    revisions: {
      1: [
        {
          previousConsultationType: "FOLLOWUP",
          previousContent: "문의 내용",
          previousOccurredAt: "2026-11-01T13:00:00+09:00",
          correctedBy: "이중개",
          correctedAt: "2026-11-02T09:00:00+09:00",
          correctionReason: "유형 오입력 정정",
        },
      ],
    },
    nextId: 900,
  };
}

let state = initialState();

export function resetMockCustomerState(): void {
  state = initialState();
}

export function getMockCustomerState(): CustomerMockState {
  return state;
}

export function setMockCustomerState(partial: Partial<CustomerMockState>): void {
  state = { ...state, ...partial };
}

function paged<T>(items: T[], url: URL) {
  const page = Number(url.searchParams.get("page") ?? 0);
  const size = Number(url.searchParams.get("size") ?? 25);
  return {
    items: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
  };
}

function toListItem(customer: CustomerDetailResponse): CustomerListResponse["items"][number] {
  return {
    customerId: customer.customerId,
    name: customer.name,
    isCorporation: customer.isCorporation,
    phone: customer.phone,
    roles: customer.roles,
    deletedAt: customer.deletedAt,
    updatedAt: customer.updatedAt,
    officeId: customer.officeId,
    createdAt: customer.createdAt,
    version: customer.version,
  };
}

function findCustomer(id: string | readonly string[] | undefined) {
  return state.customers.find((item) => String(item.customerId) === String(id));
}

function replaceCustomer(next: CustomerDetailResponse) {
  state.customers = state.customers.map((item) =>
    item.customerId === next.customerId ? next : item,
  );
  return next;
}

function bumped(customer: CustomerDetailResponse, changes: Partial<CustomerDetailResponse>) {
  return replaceCustomer({
    ...customer,
    ...changes,
    updatedAt: NOW,
    version: customer.version + 1,
  });
}

function matchVersion(request: Request, version: number): boolean {
  const header = request.headers.get("If-Match");
  return header === null || Number(header) === version;
}

const SENSITIVE = /\d{6}-?[1-4]\d{6}/;

function hasSensitive(body: Record<string, unknown>): boolean {
  return Object.values(body).some((value) => typeof value === "string" && SENSITIVE.test(value));
}

export const customerHandlers = [
  http.get("/api/customers", ({ request }) => {
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const keyword = url.searchParams.get("keyword");
    const archived = url.searchParams.get("archived") === "true";
    const filtered = state.customers.filter((item) => {
      if (item.status === "MERGED") return false;
      if (Boolean(item.deletedAt) !== archived) return false;
      if (role && !item.roles.includes(role)) return false;
      if (keyword && !`${item.name}${item.phone ?? ""}`.includes(keyword)) return false;
      return true;
    });
    return HttpResponse.json(paged(filtered.map(toListItem), url));
  }),

  http.get("/api/customers/duplicate-candidates", ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const phone = url.searchParams.get("phone");
    if (!name || !phone) {
      return mockErrors.validation([{ field: "name", message: "이름과 연락처가 필요합니다." }]);
    }
    const items = state.customers
      .filter((item) => item.status !== "MERGED" && item.name === name && item.phone === phone)
      .map((item) => ({
        customerId: item.customerId,
        name: item.name,
        isCorporation: item.isCorporation,
        phone: item.phone ?? null,
        roles: item.roles,
        deletedAt: item.deletedAt ?? null,
        managingMembershipId: item.managingMembershipId,
      }));
    return HttpResponse.json({ items });
  }),

  http.post("/api/customers/merge", async ({ request }) => {
    const body = (await request.json()) as {
      primaryCustomerId: number;
      mergedCustomerId: number;
      keepFirstInquiryId?: number;
      mergedCustomerVersion: number;
      fieldChoices?: Record<string, "PRIMARY" | "MERGED">;
    };
    const primary = state.customers.find((item) => item.customerId === body.primaryCustomerId);
    const merged = state.customers.find((item) => item.customerId === body.mergedCustomerId);
    if (!primary || !merged) return mockErrors.notFound();
    if (primary.status === "MERGED" || merged.status === "MERGED") {
      return errorResponse(409, "INVALID_TRANSITION", "이미 병합되었습니다.");
    }
    if (primary.status === "ARCHIVED" || merged.status === "ARCHIVED") {
      return errorResponse(409, "CUSTOMER_ARCHIVED", "보관된 고객입니다.");
    }
    if (!matchVersion(request, primary.version) || merged.version !== body.mergedCustomerVersion) {
      return mockErrors.versionConflict(primary.version);
    }
    const choices = body.fieldChoices ?? {};
    const picked: Partial<CustomerDetailResponse> = {};
    for (const [field, side] of Object.entries(choices)) {
      if (side === "MERGED") {
        Object.assign(picked, { [field]: (merged as Record<string, unknown>)[field] });
      }
    }
    bumped(primary, picked);
    replaceCustomer({
      ...merged,
      status: "MERGED",
      mergedIntoCustomerId: primary.customerId,
      version: merged.version + 1,
    });
    return HttpResponse.json({
      primaryCustomerId: primary.customerId,
      mergedCustomerId: merged.customerId,
      mergedAt: NOW,
      version: primary.version + 1,
    });
  }),

  http.post("/api/customers", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown> & { name: string };
    if (hasSensitive(body)) {
      return errorResponse(400, "SENSITIVE_DATA_DETECTED", "민감정보가 감지되었습니다.");
    }
    const created = buildMockCustomer({
      ...(body as Partial<CustomerDetailResponse>),
      customerId: state.nextId++,
      name: body.name,
      roles: ["OTHER"],
      deletable: true,
    });
    state.customers = [created, ...state.customers];
    return HttpResponse.json(
      {
        customerId: created.customerId,
        deletedAt: null,
        officeId: 12,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
        processingBasis: created.processingBasis,
      },
      { status: 201 },
    );
  }),

  http.get("/api/customers/:customerId", ({ params }) => {
    const customer = findCustomer(params.customerId);
    if (!customer) return mockErrors.notFound();
    if (customer.status === "MERGED") {
      return HttpResponse.json({
        ...customer,
        consultations: [],
        relatedProperties: [],
        upcomingContracts: [],
        pastContracts: [],
        visits: [],
        tasks: [],
        demandConditions: [],
        deletable: false,
      });
    }
    return HttpResponse.json(customer);
  }),

  http.patch("/api/customers/:customerId", async ({ params, request }) => {
    const customer = findCustomer(params.customerId);
    if (!customer) return mockErrors.notFound();
    if (customer.status === "MERGED") {
      return errorResponse(409, "INVALID_TRANSITION", "병합된 고객입니다.");
    }
    if (customer.deletedAt) return errorResponse(409, "CUSTOMER_ARCHIVED", "보관된 고객입니다.");
    if (!matchVersion(request, customer.version)) {
      return mockErrors.versionConflict(customer.version);
    }
    const body = (await request.json()) as Record<string, unknown>;
    if (hasSensitive(body)) {
      return errorResponse(400, "SENSITIVE_DATA_DETECTED", "민감정보가 감지되었습니다.");
    }
    return HttpResponse.json(bumped(customer, body as Partial<CustomerDetailResponse>));
  }),

  http.delete("/api/customers/:customerId", ({ params }) => {
    const customer = findCustomer(params.customerId);
    if (!customer) return mockErrors.notFound();
    if (customer.deletable) {
      state.customers = state.customers.filter((item) => item !== customer);
    } else {
      bumped(customer, { deletedAt: NOW, status: "ARCHIVED" });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/customers/:customerId/restore", ({ params }) => {
    const customer = findCustomer(params.customerId);
    if (!customer) return mockErrors.notFound();
    if (!customer.deletedAt) {
      return errorResponse(409, "CUSTOMER_NOT_ARCHIVED", "보관된 고객이 아닙니다.");
    }
    return HttpResponse.json(bumped(customer, { deletedAt: null, status: "ACTIVE" }));
  }),

  http.get("/api/customers/:customerId/consultations", ({ params }) => {
    const customer = findCustomer(params.customerId);
    if (!customer) return mockErrors.notFound();
    const items = state.consultations
      .filter((item) => item.customerId === customer.customerId)
      .map(({ customerId, ...rest }) => {
        void customerId;
        return rest;
      });
    return HttpResponse.json({ items });
  }),

  http.post("/api/customers/:customerId/consultations", async ({ params, request }) => {
    const customer = findCustomer(params.customerId);
    if (!customer) return mockErrors.notFound();
    const body = (await request.json()) as {
      occurredAt: string;
      content: string;
      consultationType: "FIRST_INQUIRY" | "FOLLOWUP";
    };
    if ("authorMembershipId" in body) {
      return errorResponse(400, "INVALID_REQUEST", "작성자는 입력할 수 없습니다.");
    }
    const hasFirst = state.consultations.some(
      (item) =>
        item.customerId === customer.customerId && item.consultationType === "FIRST_INQUIRY",
    );
    if (body.consultationType === "FIRST_INQUIRY" && hasFirst) {
      return errorResponse(409, "FIRST_INQUIRY_ALREADY_EXISTS", "최초문의가 이미 있습니다.");
    }
    const created = {
      consultationId: state.nextId++,
      customerId: customer.customerId,
      consultationType: body.consultationType,
      occurredAt: body.occurredAt,
      content: body.content,
      authorMembershipId: 2,
      authorName: "이중개",
      revisionCount: 0,
      officeId: 12,
      version: 1,
    };
    state.consultations = [...state.consultations, created];
    return HttpResponse.json(
      {
        consultationId: created.consultationId,
        customerId: created.customerId,
        occurredAt: created.occurredAt,
        authorMembershipId: 2,
        content: created.content,
        consultationType: created.consultationType,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
        officeId: 12,
      },
      { status: 201 },
    );
  }),

  http.patch("/api/customer-consultations/:consultationId", async ({ params, request }) => {
    const target = state.consultations.find(
      (item) => String(item.consultationId) === params.consultationId,
    );
    if (!target) return mockErrors.notFound();
    if (!matchVersion(request, target.version)) return mockErrors.versionConflict(target.version);
    const body = (await request.json()) as {
      occurredAt?: string;
      content?: string;
      consultationType?: "FIRST_INQUIRY" | "FOLLOWUP";
      correctionReason: string;
    };
    if (
      body.consultationType === "FIRST_INQUIRY" &&
      state.consultations.some(
        (item) =>
          item !== target &&
          item.customerId === target.customerId &&
          item.consultationType === "FIRST_INQUIRY",
      )
    ) {
      return errorResponse(409, "FIRST_INQUIRY_ALREADY_EXISTS", "최초문의가 이미 있습니다.");
    }
    state.revisions[target.consultationId] = [
      ...(state.revisions[target.consultationId] ?? []),
      {
        previousConsultationType: target.consultationType as "FIRST_INQUIRY" | "FOLLOWUP",
        previousContent: target.content,
        previousOccurredAt: target.occurredAt,
        correctedBy: "이중개",
        correctedAt: NOW,
        correctionReason: body.correctionReason,
      },
    ];
    const updated = {
      ...target,
      occurredAt: body.occurredAt ?? target.occurredAt,
      content: body.content ?? target.content,
      consultationType: body.consultationType ?? target.consultationType,
      revisionCount: target.revisionCount + 1,
      version: target.version + 1,
    };
    state.consultations = state.consultations.map((item) => (item === target ? updated : item));
    return HttpResponse.json({
      consultationId: updated.consultationId,
      customerId: updated.customerId,
      occurredAt: updated.occurredAt,
      authorMembershipId: 2,
      content: updated.content,
      consultationType: updated.consultationType,
      createdAt: NOW,
      updatedAt: NOW,
      version: updated.version,
      officeId: 12,
    });
  }),

  http.get("/api/customer-consultations/:consultationId/revisions", ({ params }) =>
    HttpResponse.json({ items: state.revisions[Number(params.consultationId)] ?? [] }),
  ),

  http.post("/api/customers/:customerId/property-interests", async ({ params, request }) => {
    const customer = findCustomer(params.customerId);
    if (!customer) return mockErrors.notFound();
    const body = (await request.json()) as {
      propertyId: number;
      startDate: string;
      endDate?: string | null;
      note?: string | null;
    };
    if (body.endDate && body.endDate < body.startDate) {
      return errorResponse(400, "INVALID_RANGE", "종료일이 시작일보다 빠릅니다.");
    }
    const interestId = state.nextId++;
    bumped(customer, {
      relatedProperties: [
        ...customer.relatedProperties,
        {
          propertyId: body.propertyId,
          propertyName: `매물 ${body.propertyId}`,
          role: "INTEREST",
          startDate: body.startDate,
          endDate: body.endDate ?? null,
          linkId: null,
          interestId,
          note: body.note ?? null,
        },
      ],
    });
    return HttpResponse.json(
      {
        interestId,
        officeId: 12,
        customerId: customer.customerId,
        propertyId: body.propertyId,
        startDate: body.startDate,
        endDate: body.endDate ?? null,
        note: body.note ?? null,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.patch("/api/customer-property-interests/:interestId", async ({ params, request }) => {
    const owner = state.customers.find((customer) =>
      customer.relatedProperties.some((item) => String(item.interestId) === params.interestId),
    );
    const interest = owner?.relatedProperties.find(
      (item) => String(item.interestId) === params.interestId,
    );
    if (!owner || !interest) return mockErrors.notFound();
    if (!matchVersion(request, owner.version)) return mockErrors.versionConflict(owner.version);
    const body = (await request.json()) as { endDate?: string | null; note?: string | null };
    const endDate = body.endDate === undefined ? interest.endDate : body.endDate;
    if (endDate && endDate < interest.startDate) {
      return errorResponse(400, "INVALID_RANGE", "종료일이 시작일보다 빠릅니다.");
    }
    const updated = {
      ...interest,
      endDate,
      note: body.note === undefined ? interest.note : body.note,
    };
    bumped(owner, {
      relatedProperties: owner.relatedProperties.map((item) =>
        item === interest ? updated : item,
      ),
    });
    return HttpResponse.json({
      interestId: updated.interestId,
      officeId: 12,
      customerId: owner.customerId,
      propertyId: updated.propertyId,
      startDate: updated.startDate,
      endDate: updated.endDate,
      note: updated.note,
      createdAt: NOW,
      updatedAt: NOW,
      version: owner.version + 1,
    });
  }),

  http.post("/api/properties/:propertyId/owner-occupants", async ({ params, request }) => {
    const body = (await request.json()) as {
      customerId: number;
      role: "OWNER" | "OCCUPANT";
      startDate: string;
    };
    const customer = state.customers.find((item) => item.customerId === body.customerId);
    if (!customer) return mockErrors.notFound();
    const linkId = state.nextId++;
    bumped(customer, {
      relatedProperties: [
        ...customer.relatedProperties,
        {
          propertyId: Number(params.propertyId),
          propertyName: `매물 ${params.propertyId}`,
          role: body.role,
          startDate: body.startDate,
          endDate: null,
          linkId,
          interestId: null,
          note: null,
        },
      ],
    });
    return HttpResponse.json(
      {
        linkId,
        officeId: 12,
        propertyId: Number(params.propertyId),
        customerId: body.customerId,
        role: body.role,
        startDate: body.startDate,
        endDate: null,
        confirmedByMembershipId: 2,
        confirmedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.patch("/api/owner-occupants/:linkId", async ({ params, request }) => {
    const owner = state.customers.find((customer) =>
      customer.relatedProperties.some((item) => String(item.linkId) === params.linkId),
    );
    const link = owner?.relatedProperties.find((item) => String(item.linkId) === params.linkId);
    if (!owner || !link) return mockErrors.notFound();
    const body = (await request.json()) as { endDate?: string | null };
    if (body.endDate && body.endDate < link.startDate) {
      return errorResponse(400, "INVALID_RANGE", "종료일이 시작일보다 빠릅니다.");
    }
    const updated = { ...link, endDate: body.endDate ?? null };
    bumped(owner, {
      relatedProperties: owner.relatedProperties.map((item) => (item === link ? updated : item)),
    });
    return HttpResponse.json({
      linkId: updated.linkId ?? 0,
      officeId: 12,
      propertyId: updated.propertyId,
      customerId: owner.customerId,
      role: updated.role === "INTEREST" ? "OWNER" : updated.role,
      startDate: updated.startDate,
      endDate: updated.endDate,
      confirmedByMembershipId: null,
      confirmedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      version: 2,
    });
  }),

  http.post("/api/customers/:customerId/demand-conditions", async ({ params, request }) => {
    const customer = findCustomer(params.customerId);
    if (!customer) return mockErrors.notFound();
    const body = (await request.json()) as Record<string, unknown> & {
      dealType: "SALE" | "JEONSE" | "MONTHLY";
      regions?: string[] | null;
    };
    const rangeError = findRangeError(body);
    if (rangeError) return rangeError;
    const conditionId = state.nextId++;
    const regions = (body.regions ?? []).map((regionName, index) => ({
      regionId: index + 1,
      regionName,
    }));
    const condition = {
      conditionId,
      dealType: body.dealType,
      categoryId: (body.categoryId as number | null | undefined) ?? null,
      priceMin: (body.priceMin as number | null | undefined) ?? null,
      priceMax: (body.priceMax as number | null | undefined) ?? null,
      depositMin: (body.depositMin as number | null | undefined) ?? null,
      depositMax: (body.depositMax as number | null | undefined) ?? null,
      rentMin: (body.rentMin as number | null | undefined) ?? null,
      rentMax: (body.rentMax as number | null | undefined) ?? null,
      areaMin: (body.areaMin as number | null | undefined) ?? null,
      areaMax: (body.areaMax as number | null | undefined) ?? null,
      moveInDate: (body.moveInDate as string | null | undefined) ?? null,
      regions,
      version: 1,
    };
    bumped(customer, {
      demandConditions: [...customer.demandConditions, condition],
      roles: customer.roles.includes("DEMAND") ? customer.roles : [...customer.roles, "DEMAND"],
    });
    return HttpResponse.json(
      {
        ...condition,
        customerId: customer.customerId,
        createdAt: NOW,
        officeId: 12,
        updatedAt: NOW,
        regions: regions.map((item) => ({ ...item, demandConditionId: conditionId })),
      },
      { status: 201 },
    );
  }),

  http.patch("/api/demand-conditions/:conditionId", async ({ params, request }) => {
    const owner = state.customers.find((customer) =>
      customer.demandConditions.some((item) => String(item.conditionId) === params.conditionId),
    );
    const condition = owner?.demandConditions.find(
      (item) => String(item.conditionId) === params.conditionId,
    );
    if (!owner || !condition) return mockErrors.notFound();
    if (!matchVersion(request, condition.version)) {
      return mockErrors.versionConflict(condition.version);
    }
    const body = (await request.json()) as Record<string, unknown> & { regions?: string[] | null };
    const rangeError = findRangeError({ ...condition, ...body });
    if (rangeError) return rangeError;
    const { regions: regionNames, ...rest } = body;
    const updated = {
      ...condition,
      ...rest,
      regions: regionNames
        ? regionNames.map((regionName, index) => ({ regionId: index + 1, regionName }))
        : condition.regions,
      version: condition.version + 1,
    } as typeof condition;
    bumped(owner, {
      demandConditions: owner.demandConditions.map((item) => (item === condition ? updated : item)),
    });
    return HttpResponse.json({
      ...updated,
      customerId: owner.customerId,
      createdAt: NOW,
      officeId: 12,
      updatedAt: NOW,
      regions: updated.regions.map((item) => ({ ...item, demandConditionId: updated.conditionId })),
    });
  }),

  http.get("/api/demand-conditions/:conditionId/candidate-properties", () =>
    HttpResponse.json({
      items: [
        {
          propertyId: 501,
          name: "국민대 앞 아파트",
          dealType: "MONTHLY",
          depositAmount: 20_000_000,
          salePrice: null,
          monthlyRentAmount: 900_000,
        },
      ],
    }),
  ),
];

function findRangeError(body: Record<string, unknown>) {
  const pairs: Array<[string, string]> = [
    ["priceMin", "priceMax"],
    ["depositMin", "depositMax"],
    ["rentMin", "rentMax"],
    ["areaMin", "areaMax"],
  ];
  for (const [low, high] of pairs) {
    const lowValue = body[low];
    const highValue = body[high];
    if (typeof lowValue === "number" && typeof highValue === "number" && lowValue > highValue) {
      return errorResponse(400, "INVALID_RANGE", "하한이 상한보다 큽니다.");
    }
  }
  return null;
}
