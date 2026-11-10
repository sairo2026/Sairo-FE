import { http, HttpResponse } from "msw";
import type {
  PropertyCategoryListResponse,
  PropertyDetailResponse,
  PropertyFieldDefinitionListResponse,
  PropertyListResponse,
} from "@/lib/api/contracts/property.schema";
import { errorResponse, mockErrors } from "../error-responses";

const NOW = "2026-11-10T09:00:00+09:00";

type CategoryItem = PropertyCategoryListResponse["items"][number];
type FieldItem = PropertyFieldDefinitionListResponse["items"][number];
type OfferItem = PropertyDetailResponse["offers"][number] & { version: number };
type CustomFieldType = PropertyDetailResponse["customFields"][number]["fieldType"];
type PhotoItem = PropertyDetailResponse["photos"][number];

export type PropertyMockState = {
  categories: CategoryItem[];
  fields: Record<number, FieldItem[]>;
  properties: PropertyDetailResponse[];
  nextId: number;
};

const SYSTEM_CATEGORY_NAMES = [
  "상업용건물",
  "토지",
  "상가·사무실",
  "공장·창고",
  "단독·다가구",
  "아파트",
  "오피스텔",
  "연립·다세대",
  "숙박시설",
  "분양권",
];

function field(
  id: number,
  name: string,
  type: FieldItem["fieldType"],
  extra: Partial<FieldItem> = {},
): FieldItem {
  return {
    fieldDefinitionId: id,
    fieldName: name,
    fieldType: type,
    numberKind: type === "NUMBER" ? "INTEGER" : null,
    unit: null,
    minValue: null,
    maxValue: null,
    active: true,
    ...extra,
  };
}

export function buildMockProperty(
  partial: Partial<PropertyDetailResponse> & Pick<PropertyDetailResponse, "propertyId" | "name">,
): PropertyDetailResponse {
  return {
    customFields: [],
    offers: [],
    photos: [],
    categoryId: 6,
    categoryName: "아파트",
    registrationStage: "ACTIVE",
    address: "서울특별시 성북구 정릉로 77",
    addressDetail: "101동 1201호",
    managingMembershipId: 2,
    managingMemberName: "이중개",
    exclusiveAreaSqm: 59.8,
    supplyAreaSqm: 75.2,
    landAreaSqm: null,
    grossFloorAreaSqm: null,
    moveInDate: null,
    moveInNegotiable: true,
    maintenanceFeeAmount: 150000,
    maintenanceFeeItems: "수도·인터넷 포함",
    occupancyStatus: "TENANT_OCCUPIED",
    description: "역세권 풀옵션",
    memo: null,
    referenceLeaseEndDate: null,
    referenceLeaseEndSource: null,
    archivedCustomFields: [],
    activeCoordinations: [],
    ownerOccupants: [],
    visits: [],
    contracts: [],
    leaseEndDate: null,
    leaseEndSource: null,
    deletedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    officeId: 12,
    version: 1,
    ...partial,
  };
}

function initialState(): PropertyMockState {
  const categories: CategoryItem[] = SYSTEM_CATEGORY_NAMES.map((name, index) => ({
    categoryId: index + 1,
    name,
    isSystem: true,
    active: true,
  }));
  categories.push({ categoryId: 11, name: "주차장", isSystem: false, active: true });
  return {
    categories,
    fields: {
      3: [
        field(41, "해당층", "NUMBER", { minValue: 0, unit: "층" }),
        field(42, "업종 제한", "TEXT"),
        field(43, "전용률", "NUMBER", {
          numberKind: "DECIMAL",
          unit: "%",
          minValue: 0,
          maxValue: 100,
        }),
        field(44, "승강기", "BOOLEAN"),
      ],
      6: [
        field(31, "동·호", "TEXT"),
        field(33, "해당층", "NUMBER", { minValue: 0, unit: "층" }),
        field(34, "준공일", "DATE"),
      ],
      10: [field(51, "프리미엄", "NUMBER", { numberKind: "INTEGER", unit: "원" })],
      11: [field(61, "차량 높이 제한", "NUMBER", { numberKind: "DECIMAL" })],
    },
    properties: [
      buildMockProperty({
        propertyId: 501,
        name: "국민대 앞 아파트",
        customFields: [
          { fieldDefinitionId: 33, fieldName: "해당층", fieldType: "NUMBER", value: 12 },
        ],
        offers: [
          {
            offerId: 701,
            dealType: "MONTHLY",
            status: "AVAILABLE",
            salePrice: null,
            depositAmount: 20_000_000,
            monthlyRentAmount: 900_000,
            premiumAmount: null,
          },
        ],
        ownerOccupants: [
          {
            linkId: 41,
            customerId: 301,
            customerName: "김소유",
            role: "OWNER",
            startDate: "2024-01-01",
            endDate: null,
          },
        ],
        leaseEndDate: "2027-03-31",
        leaseEndSource: "CONTRACT",
      }),
      buildMockProperty({
        propertyId: 502,
        name: "정릉 상가",
        categoryId: 3,
        categoryName: "상가·사무실",
        registrationStage: "DRAFT",
        address: null,
        addressDetail: null,
        managingMembershipId: null,
        managingMemberName: null,
        occupancyStatus: "UNKNOWN",
      }),
    ],
    nextId: 900,
  };
}

let state = initialState();

export function resetMockPropertyState(): void {
  state = initialState();
}

export function getMockPropertyState(): PropertyMockState {
  return state;
}

export function setMockPropertyState(partial: Partial<PropertyMockState>): void {
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

function toListItem(detail: PropertyDetailResponse): PropertyListResponse["items"][number] {
  return {
    activeOfferSummary: detail.offers
      .filter((offer) => offer.status === "AVAILABLE" || offer.status === "NEGOTIATING")
      .map((offer) => ({
        dealType: offer.dealType,
        status: offer.status,
        salePrice: offer.salePrice,
        depositAmount: offer.depositAmount,
        monthlyRentAmount: offer.monthlyRentAmount,
        premiumAmount: offer.premiumAmount,
      })),
    updatedAt: detail.updatedAt,
    propertyId: detail.propertyId,
    name: detail.name,
    address: detail.address ?? null,
    addressDetail: detail.addressDetail,
    categoryId: detail.categoryId,
    categoryName: detail.categoryName,
    registrationStage: detail.registrationStage,
    managingMembershipId: detail.managingMembershipId,
    managingMemberName: detail.managingMemberName,
    occupancyStatus: detail.occupancyStatus,
    ownerNames: detail.ownerOccupants
      .filter((item) => item.role === "OWNER")
      .map((item) => item.customerName),
    occupantNames: detail.ownerOccupants
      .filter((item) => item.role === "OCCUPANT")
      .map((item) => item.customerName),
    leaseEndDate: detail.leaseEndDate,
    leaseEndSource: detail.leaseEndSource,
    memo: detail.memo,
    officeId: detail.officeId,
    createdAt: detail.createdAt,
    version: detail.version,
  };
}

function findProperty(id: string | readonly string[] | undefined) {
  return state.properties.find((item) => String(item.propertyId) === String(id));
}

function replaceProperty(next: PropertyDetailResponse) {
  state.properties = state.properties.map((item) =>
    item.propertyId === next.propertyId ? next : item,
  );
  return next;
}

function bumped(property: PropertyDetailResponse, changes: Partial<PropertyDetailResponse>) {
  return replaceProperty({
    ...property,
    ...changes,
    updatedAt: NOW,
    version: property.version + 1,
  });
}

type VersionCheck = "ok" | "missing" | "conflict";

function checkVersion(request: Request, version: number): VersionCheck {
  const header = request.headers.get("If-Match");
  if (header === null || header.trim() === "" || Number.isNaN(Number(header))) return "missing";
  return Number(header) === version ? "ok" : "conflict";
}

function versionFailure(check: VersionCheck, version: number) {
  if (check === "missing")
    return mockErrors.validation([{ field: "If-Match", message: "매물 버전이 필요합니다." }]);
  return mockErrors.versionConflict(version);
}

function categoryOf(id: number) {
  return state.categories.find((item) => item.categoryId === id);
}

export const propertyHandlers = [
  http.get("/api/properties", ({ request }) => {
    const url = new URL(request.url);
    const keyword = url.searchParams.get("keyword");
    const categoryId = url.searchParams.get("categoryId");
    const dealType = url.searchParams.get("dealType");
    const stage = url.searchParams.get("registrationStage");
    const manager = url.searchParams.get("managingMembershipId");
    const archived = url.searchParams.get("archived") === "true";
    const areaMin = url.searchParams.get("areaMin");
    const areaMax = url.searchParams.get("areaMax");
    if ((areaMin || areaMax) && !url.searchParams.get("areaType")) {
      return mockErrors.validation([{ field: "areaType", message: "면적 종류를 선택해 주세요." }]);
    }
    const filtered = state.properties.filter((item) => {
      if ((item.deletedAt !== null && item.deletedAt !== undefined) !== archived) return false;
      if (keyword && !`${item.name}${item.address ?? ""}`.includes(keyword)) return false;
      if (categoryId && String(item.categoryId) !== categoryId) return false;
      if (stage && item.registrationStage !== stage) return false;
      if (manager && String(item.managingMembershipId) !== manager) return false;
      if (dealType && !item.offers.some((offer) => offer.dealType === dealType)) return false;
      return true;
    });
    return HttpResponse.json(paged(filtered.map(toListItem), url));
  }),

  http.get("/api/properties/duplicate-check", ({ request }) => {
    const address = new URL(request.url).searchParams.get("address") ?? "";
    const matches = state.properties
      .filter((item) => address !== "" && item.address === address)
      .map((item) => ({
        propertyId: item.propertyId,
        address: item.address ?? null,
        addressDetail: item.addressDetail,
        categoryName: item.categoryName,
        registrationStage: item.registrationStage,
      }));
    return HttpResponse.json({ matches });
  }),

  http.post("/api/properties", async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      categoryId: number;
      address?: string | null;
      managingMembershipId?: number | null;
    };
    const category = categoryOf(body.categoryId);
    if (!category || !category.active) {
      return mockErrors.validation([
        { field: "categoryId", message: "선택할 수 없는 카테고리입니다." },
      ]);
    }
    const created = buildMockProperty({
      ...(body as Partial<PropertyDetailResponse>),
      propertyId: state.nextId++,
      name: body.name,
      categoryId: category.categoryId,
      categoryName: category.name,
      registrationStage: "DRAFT",
      address: body.address ?? null,
      managingMembershipId: body.managingMembershipId ?? null,
      managingMemberName: body.managingMembershipId ? "이중개" : null,
      moveInNegotiable: false,
      occupancyStatus: "UNKNOWN",
      customFields: [],
      offers: [],
    });
    state.properties = [created, ...state.properties];
    return HttpResponse.json(
      {
        propertyId: created.propertyId,
        registrationStage: "DRAFT",
        officeId: 12,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      },
      { status: 201 },
    );
  }),

  http.get("/api/properties/:propertyId", ({ params }) => {
    const property = findProperty(params.propertyId);
    return property ? HttpResponse.json(property) : mockErrors.notFound();
  }),

  http.patch("/api/properties/:propertyId/category", async ({ params, request }) => {
    const property = findProperty(params.propertyId);
    if (!property) return mockErrors.notFound();
    if (property.deletedAt) return errorResponse(409, "PROPERTY_ARCHIVED", "보관된 매물입니다.");
    const check = checkVersion(request, property.version);
    if (check !== "ok") return versionFailure(check, property.version);
    const { categoryId } = (await request.json()) as { categoryId: number };
    const category = categoryOf(categoryId);
    if (!category) return mockErrors.notFound();
    const archivedCustomFields = [
      ...property.archivedCustomFields,
      ...property.customFields.map((item) => ({
        ...item,
        previousCategoryId: property.categoryId,
        previousCategoryName: property.categoryName,
      })),
    ];
    const next = bumped(property, {
      categoryId,
      categoryName: category.name,
      customFields: [],
      archivedCustomFields,
    });
    return HttpResponse.json(next);
  }),

  http.patch("/api/properties/:propertyId", async ({ params, request }) => {
    const property = findProperty(params.propertyId);
    if (!property) return mockErrors.notFound();
    if (property.deletedAt) return errorResponse(409, "PROPERTY_ARCHIVED", "보관된 매물입니다.");
    const check = checkVersion(request, property.version);
    if (check !== "ok") return versionFailure(check, property.version);
    const body = (await request.json()) as Partial<PropertyDetailResponse>;
    if (body.registrationStage === "ACTIVE") {
      const address = body.address ?? property.address;
      const manager = body.managingMembershipId ?? property.managingMembershipId;
      if (!address || !manager) {
        return errorResponse(400, "INCOMPLETE_FOR_ACTIVATION", "주소와 담당자가 필요합니다.");
      }
    }
    const next = bumped(property, {
      ...body,
      managingMemberName: body.managingMembershipId ? "이중개" : property.managingMemberName,
    });
    return HttpResponse.json(next);
  }),

  http.delete("/api/properties/:propertyId", ({ params }) => {
    const property = findProperty(params.propertyId);
    if (!property) return mockErrors.notFound();
    if (property.activeCoordinations.length > 0) {
      return errorResponse(409, "PROPERTY_HAS_ACTIVE_COORDINATION", "진행 중인 조율이 있습니다.");
    }
    if (property.contracts.some((item) => item.contractStatus === "SIGNED")) {
      return errorResponse(409, "PROPERTY_HAS_ACTIVE_CONTRACT", "진행 중인 계약이 있습니다.");
    }
    if (property.registrationStage === "DRAFT" && property.visits.length === 0) {
      state.properties = state.properties.filter((item) => item !== property);
    } else {
      bumped(property, { deletedAt: NOW });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/properties/:propertyId/restore", ({ params }) => {
    const property = findProperty(params.propertyId);
    if (!property) return mockErrors.notFound();
    if (!property.deletedAt)
      return errorResponse(409, "PROPERTY_NOT_ARCHIVED", "보관된 매물이 아닙니다.");
    return HttpResponse.json(bumped(property, { deletedAt: null }));
  }),

  http.put("/api/properties/:propertyId/fields/:fieldId", async ({ params, request }) => {
    const property = findProperty(params.propertyId);
    if (!property) return mockErrors.notFound();
    const fieldId = Number(params.fieldId);
    const definition = (state.fields[property.categoryId] ?? []).find(
      (item) => item.fieldDefinitionId === fieldId,
    );
    if (!definition) return mockErrors.notFound();
    if (!definition.active) return errorResponse(409, "FIELD_INACTIVE", "보관된 입력 항목입니다.");
    const check = checkVersion(request, property.version);
    if (check !== "ok") return versionFailure(check, property.version);
    const { value } = (await request.json()) as { value: string | number | boolean | null };
    const others = property.customFields.filter((item) => item.fieldDefinitionId !== fieldId);
    const customFields =
      value === null
        ? others
        : [
            ...others,
            {
              fieldDefinitionId: fieldId,
              fieldName: definition.fieldName,
              fieldType: definition.fieldType as CustomFieldType,
              value,
            },
          ];
    const next = bumped(property, { customFields });
    return HttpResponse.json({
      fieldDefinitionId: fieldId,
      value,
      officeId: 12,
      updatedAt: NOW,
      version: next.version,
    });
  }),

  http.post("/api/properties/:propertyId/photos", ({ params }) => {
    const property = findProperty(params.propertyId);
    if (!property) return mockErrors.notFound();
    if (property.photos.length >= 20) {
      return mockErrors.validation([
        { field: "file", message: "사진은 20장까지 올릴 수 있습니다." },
      ]);
    }
    const photoId = state.nextId++;
    const photo: PhotoItem = {
      photoId,
      objectKey: `properties/${property.propertyId}/photo-${photoId}.jpg`,
      description: null,
      sortOrder: property.photos.length + 1,
      url: `https://storage.example.com/signed/photo-${photoId}.jpg`,
      urlExpiresAt: "2026-11-10T09:10:00+09:00",
    };
    const next = bumped(property, { photos: [...property.photos, photo] });
    return HttpResponse.json(
      { ...photo, officeId: 12, updatedAt: NOW, version: next.version },
      { status: 201 },
    );
  }),

  http.patch("/api/properties/:propertyId/photos/:photoId", async ({ params, request }) => {
    const property = findProperty(params.propertyId);
    const photo = property?.photos.find((item) => String(item.photoId) === params.photoId);
    if (!property || !photo) return mockErrors.notFound();
    const check = checkVersion(request, property.version);
    if (check !== "ok") return versionFailure(check, property.version);
    const body = (await request.json()) as { description?: string | null; sortOrder?: number };
    const updated = { ...photo, ...body };
    const next = bumped(property, {
      photos: property.photos.map((item) => (item === photo ? updated : item)),
    });
    return HttpResponse.json({ ...updated, officeId: 12, updatedAt: NOW, version: next.version });
  }),

  http.delete("/api/properties/:propertyId/photos/:photoId", ({ params }) => {
    const property = findProperty(params.propertyId);
    if (!property) return mockErrors.notFound();
    bumped(property, {
      photos: property.photos.filter((item) => String(item.photoId) !== params.photoId),
    });
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/properties/:propertyId/offers", ({ params }) => {
    const property = findProperty(params.propertyId);
    if (!property) return mockErrors.notFound();
    return HttpResponse.json({
      items: property.offers.map((offer) => ({
        ...offer,
        officeId: 12,
        version: property.version,
      })),
    });
  }),

  http.post("/api/properties/:propertyId/offers", async ({ params, request }) => {
    const property = findProperty(params.propertyId);
    if (!property) return mockErrors.notFound();
    if (property.deletedAt) return errorResponse(409, "PROPERTY_ARCHIVED", "보관된 매물입니다.");
    const body = (await request.json()) as Omit<OfferItem, "offerId" | "status" | "version">;
    const duplicate = property.offers.some(
      (offer) =>
        offer.dealType === body.dealType &&
        (offer.status === "AVAILABLE" || offer.status === "NEGOTIATING"),
    );
    if (duplicate)
      return errorResponse(409, "OFFER_ALREADY_ACTIVE", "이미 진행 중인 제안이 있습니다.");
    const offerId = state.nextId++;
    const offer = {
      offerId,
      dealType: body.dealType,
      status: "AVAILABLE" as const,
      salePrice: body.salePrice ?? null,
      depositAmount: body.depositAmount ?? null,
      monthlyRentAmount: body.monthlyRentAmount ?? null,
      premiumAmount: body.premiumAmount ?? null,
    };
    const next = bumped(property, { offers: [...property.offers, offer] });
    return HttpResponse.json(
      { ...offer, officeId: 12, updatedAt: NOW, version: next.version },
      { status: 201 },
    );
  }),

  http.patch("/api/properties/:propertyId/offers/:offerId", async ({ params, request }) => {
    const property = findProperty(params.propertyId);
    const offer = property?.offers.find((item) => String(item.offerId) === params.offerId);
    if (!property || !offer) return mockErrors.notFound();
    if (property.deletedAt) return errorResponse(409, "PROPERTY_ARCHIVED", "보관된 매물입니다.");
    const check = checkVersion(request, property.version);
    if (check !== "ok") return versionFailure(check, property.version);
    const body = (await request.json()) as Partial<OfferItem>;
    if (offer.status === "COMPLETED" || offer.status === "WITHDRAWN") {
      return errorResponse(409, "INVALID_TRANSITION", "종료된 제안은 바꿀 수 없습니다.");
    }
    const updated = { ...offer, ...body } as PropertyDetailResponse["offers"][number];
    const next = bumped(property, {
      offers: property.offers.map((item) => (item === offer ? updated : item)),
    });
    return HttpResponse.json({ ...updated, officeId: 12, updatedAt: NOW, version: next.version });
  }),

  http.get("/api/property-categories", () => HttpResponse.json({ items: state.categories })),

  http.post("/api/property-categories", async ({ request }) => {
    const { name } = (await request.json()) as { name: string };
    if (state.categories.some((item) => item.name === name)) {
      return errorResponse(409, "CATEGORY_NAME_DUPLICATED", "같은 이름이 있습니다.");
    }
    if (state.categories.filter((item) => !item.isSystem && item.active).length >= 20) {
      return errorResponse(409, "CATEGORY_LIMIT_EXCEEDED", "상한을 넘었습니다.");
    }
    const created = { categoryId: state.nextId++, name, isSystem: false, active: true };
    state.categories = [...state.categories, created];
    return HttpResponse.json({ ...created, officeId: 12, createdAt: NOW }, { status: 201 });
  }),

  http.patch("/api/property-categories/:categoryId", async ({ params, request }) => {
    const category = state.categories.find((item) => String(item.categoryId) === params.categoryId);
    if (!category) return mockErrors.notFound();
    if (category.isSystem) {
      return errorResponse(403, "SYSTEM_CATEGORY_IMMUTABLE", "기본 카테고리는 바꿀 수 없습니다.");
    }
    const body = (await request.json()) as { name?: string; active?: boolean };
    if (
      body.name &&
      state.categories.some((item) => item !== category && item.name === body.name)
    ) {
      return errorResponse(409, "CATEGORY_NAME_DUPLICATED", "같은 이름이 있습니다.");
    }
    const updated = { ...category, ...body };
    state.categories = state.categories.map((item) => (item === category ? updated : item));
    return HttpResponse.json({ ...updated, officeId: 12, createdAt: NOW });
  }),

  http.get("/api/property-categories/:categoryId/fields", ({ params }) =>
    HttpResponse.json({ items: state.fields[Number(params.categoryId)] ?? [] }),
  ),

  http.post("/api/property-categories/:categoryId/fields", async ({ params, request }) => {
    const categoryId = Number(params.categoryId);
    const body = (await request.json()) as { fieldName: string; fieldType: FieldItem["fieldType"] };
    const existing = state.fields[categoryId] ?? [];
    if (existing.some((item) => item.fieldName === body.fieldName)) {
      return errorResponse(409, "FIELD_NAME_DUPLICATED", "같은 이름이 있습니다.");
    }
    if (existing.filter((item) => item.active).length >= 50) {
      return errorResponse(409, "FIELD_LIMIT_EXCEEDED", "상한을 넘었습니다.");
    }
    const created = field(state.nextId++, body.fieldName, body.fieldType, {
      numberKind: body.fieldType === "NUMBER" ? "DECIMAL" : null,
    });
    state.fields = { ...state.fields, [categoryId]: [...existing, created] };
    return HttpResponse.json(
      {
        fieldDefinitionId: created.fieldDefinitionId,
        categoryId,
        fieldName: created.fieldName,
        fieldType: created.fieldType,
        active: true,
        createdAt: NOW,
      },
      { status: 201 },
    );
  }),

  http.patch(
    "/api/property-categories/:categoryId/fields/:fieldId",
    async ({ params, request }) => {
      const categoryId = Number(params.categoryId);
      const existing = state.fields[categoryId] ?? [];
      const target = existing.find((item) => String(item.fieldDefinitionId) === params.fieldId);
      if (!target) return mockErrors.notFound();
      const body = (await request.json()) as { fieldName?: string; active?: boolean };
      if (
        body.fieldName &&
        existing.some((item) => item !== target && item.fieldName === body.fieldName)
      ) {
        return errorResponse(409, "FIELD_NAME_DUPLICATED", "같은 이름이 있습니다.");
      }
      const updated = { ...target, ...body };
      state.fields = {
        ...state.fields,
        [categoryId]: existing.map((item) => (item === target ? updated : item)),
      };
      return HttpResponse.json({
        fieldDefinitionId: updated.fieldDefinitionId,
        categoryId,
        fieldName: updated.fieldName,
        fieldType: updated.fieldType,
        active: updated.active,
        createdAt: NOW,
      });
    },
  ),
];
