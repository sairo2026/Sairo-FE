const AUTH_PATH_PREFIXES = [
  "/api/auth/",
  "/api/me/",
  "/api/terms",
  "/api/public/marketing-unsubscribe",
  "/api/webhooks/kakao/",
];

const OFFICE_PATH_PREFIXES = [
  "/api/offices/",
  "/api/office-registrations",
  "/api/office-change-requests",
  "/api/memberships/",
  "/api/owner-transfers/",
];

const PROPERTY_PATH_PREFIXES = ["/api/properties", "/api/property-categories"];

const PROPERTY_EXCLUDED_SEGMENTS = [
  "/owner-occupants",
  "/access-approvals",
  "/contracts",
  "/cross-office-",
  "/coordinations",
];

const BILLING_PATH_PREFIXES = [
  "/api/billing/",
  "/api/subscriptions",
  "/api/refund-requests",
  "/api/public/pricing",
  "/api/offices/current/auth-status",
  "/api/grant-auth/",
  "/api/return-grants",
  "/api/archive-grants",
];

const VISIT_PATH_PREFIXES = [
  "/api/visit-",
  "/api/public/customer-visit-links",
  "/api/public/approver-",
  "/api/approver-portal",
  "/api/apply-grants",
  "/api/public/privacy-intakes",
];

const VISIT_PATH_SEGMENTS = [
  "/access-approvals",
  "/apply-grants",
  "/cross-office-",
  "/approver-property-link",
  "/approver-conditions",
];

const WORK_PATH_PREFIXES = [
  "/api/home",
  "/api/tasks",
  "/api/notifications",
  "/api/settlements",
  "/api/entity-lifecycle-events",
];

const CONTRACT_PATH_PREFIXES = [
  "/api/contracts",
  "/api/contract-fees",
  "/api/contract-followup-tasks",
  "/api/payment-schedules",
];

const PUBLIC_SITE_DTO_NAMES = ["PublicCompanyInfoResponse"];

const CUSTOMER_PATH_PREFIXES = [
  "/api/customers",
  "/api/owner-occupants",
  "/api/customer-",
  "/api/demand-conditions",
];

const OPS_SESSION_DTO_NAMES = ["OpsMeResponse", "OpsMfaVerifyRequest", "OpsStepUpRequest"];

const COMMON_DTO_NAMES = ["AuthContextResponse", "CurrentSessionResponse"];

function startsWithAny(path, prefixes) {
  return prefixes.some(
    (prefix) => path === prefix || path === prefix.replace(/\/$/, "") || path.startsWith(prefix),
  );
}

function isAuthDto(dto) {
  return (
    dto.apis.length > 0 && dto.apis.every((api) => startsWithAny(api.path, AUTH_PATH_PREFIXES))
  );
}

function isOfficeDto(dto) {
  return (
    dto.apis.length > 0 &&
    dto.apis.every(
      (api) =>
        startsWithAny(api.path, OFFICE_PATH_PREFIXES) &&
        !api.path.startsWith("/api/offices/current/auth-status") &&
        !api.path.startsWith("/api/offices/current/close") &&
        !api.path.startsWith("/api/offices/current/export-policy"),
    )
  );
}

function isCustomerApi(path) {
  return startsWithAny(path, CUSTOMER_PATH_PREFIXES) || path.endsWith("/owner-occupants");
}

function isPropertyApi(path) {
  return (
    startsWithAny(path, PROPERTY_PATH_PREFIXES) &&
    !PROPERTY_EXCLUDED_SEGMENTS.some((segment) => path.includes(segment))
  );
}

function isPropertyDto(dto) {
  return dto.apis.length > 0 && dto.apis.every((api) => isPropertyApi(api.path));
}

function isBillingDto(dto) {
  return (
    dto.apis.length > 0 &&
    dto.apis.every(
      (api) =>
        startsWithAny(api.path, BILLING_PATH_PREFIXES) &&
        !api.path.includes("/visit-coordinations"),
    )
  );
}

function isWorkApi(path) {
  return startsWithAny(path, WORK_PATH_PREFIXES);
}

function isContractApi(path) {
  return (
    startsWithAny(path, CONTRACT_PATH_PREFIXES) ||
    (path.startsWith("/api/properties/") && path.includes("/contracts"))
  );
}

function isWorkDto(dto) {
  return dto.apis.length > 0 && dto.apis.every((api) => isWorkApi(api.path));
}

function isContractDto(dto) {
  return dto.apis.length > 0 && dto.apis.every((api) => isContractApi(api.path));
}

function isCustomerDto(dto) {
  return dto.apis.length > 0 && dto.apis.every((api) => isCustomerApi(api.path));
}

function isVisitApi(path) {
  if (path.startsWith("/api/return-grants")) return false;
  return (
    startsWithAny(path, VISIT_PATH_PREFIXES) ||
    VISIT_PATH_SEGMENTS.some((segment) => path.includes(segment))
  );
}

function isVisitDto(dto) {
  return dto.apis.length > 0 && dto.apis.every((api) => isVisitApi(api.path));
}

export const AREAS = {
  common: {
    description: "접근 상태와 세션 응답",
    select: (dto) => COMMON_DTO_NAMES.includes(dto.name),
  },
  "ops-session": {
    description: "운영 콘솔 세션 확인과 재인증",
    select: (dto) => OPS_SESSION_DTO_NAMES.includes(dto.name),
  },
  office: {
    description: "사무소 등록·심사·소속·초대·고용명부·대표 이전 도메인",
    select: (dto) => !COMMON_DTO_NAMES.includes(dto.name) && !isAuthDto(dto) && isOfficeDto(dto),
  },
  property: {
    description: "매물·카테고리·거래제안·사진 도메인",
    select: (dto) => !COMMON_DTO_NAMES.includes(dto.name) && isPropertyDto(dto),
  },
  customer: {
    description: "고객·소유점유·관심 매물·희망조건·상담·병합 도메인",
    select: (dto) => !COMMON_DTO_NAMES.includes(dto.name) && isCustomerDto(dto),
  },
  billing: {
    description: "요금·구독·결제·환불·인증 중단·반환·보관 권한 도메인",
    select: (dto) => !COMMON_DTO_NAMES.includes(dto.name) && isBillingDto(dto),
  },
  visit: {
    description: "방문 조율·출입승인·승인자 조건·방문 신청·평가·신청 허용·승인자 계정 도메인",
    select: (dto) => !COMMON_DTO_NAMES.includes(dto.name) && isVisitDto(dto),
  },
  work: {
    description: "홈·업무·알림·월말결산 도메인",
    select: (dto) => !COMMON_DTO_NAMES.includes(dto.name) && isWorkDto(dto),
  },
  contract: {
    description: "계약·정정 버전·서류·중개보수·계약 대금·후속업무 도메인",
    select: (dto) => !COMMON_DTO_NAMES.includes(dto.name) && isContractDto(dto),
  },
  "public-site": {
    description: "공개 사이트 하단 사업자 정보",
    select: (dto) => PUBLIC_SITE_DTO_NAMES.includes(dto.name),
  },
  auth: {
    description: "인증·계정 도메인",
    select: (dto) => !COMMON_DTO_NAMES.includes(dto.name) && isAuthDto(dto),
  },
};

export function selectAreaDtos(dtos, areaName) {
  const area = AREAS[areaName];
  if (!area) {
    throw new Error(
      `알 수 없는 영역: ${areaName}. 사용 가능한 영역: ${Object.keys(AREAS).join(", ")}`,
    );
  }
  return [...dtos.values()].filter((dto) => area.select(dto));
}

export const ENUM_HINTS = {
  "AuthContextResponse.role": ["OWNER", "AGENT", "DEPUTY"],
};
