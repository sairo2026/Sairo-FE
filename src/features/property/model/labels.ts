import type { BadgeTone } from "@/shared/components/ui/badge";

export const DEAL_TYPES = ["MONTHLY", "JEONSE", "SALE"] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  MONTHLY: "월세",
  JEONSE: "전세",
  SALE: "매매",
};

export const STAGE_LABEL = { DRAFT: "임시저장", ACTIVE: "활성" } as const;
export const STAGE_TONE: Record<keyof typeof STAGE_LABEL, BadgeTone> = {
  DRAFT: "gray",
  ACTIVE: "green",
};

export const OFFER_STATUSES = ["AVAILABLE", "NEGOTIATING", "COMPLETED", "WITHDRAWN"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  AVAILABLE: "거래 가능",
  NEGOTIATING: "협의 중",
  COMPLETED: "완료",
  WITHDRAWN: "철회",
};

export const OFFER_STATUS_TONE: Record<OfferStatus, BadgeTone> = {
  AVAILABLE: "blue",
  NEGOTIATING: "yellow",
  COMPLETED: "green",
  WITHDRAWN: "gray",
};

export const OCCUPANCY_STATUSES = [
  "VACANT",
  "OWNER_OCCUPIED",
  "TENANT_OCCUPIED",
  "UNKNOWN",
] as const;
export type OccupancyStatus = (typeof OCCUPANCY_STATUSES)[number];

export const OCCUPANCY_LABEL: Record<OccupancyStatus, string> = {
  VACANT: "공실",
  OWNER_OCCUPIED: "소유자 거주",
  TENANT_OCCUPIED: "임차인 거주",
  UNKNOWN: "미확인",
};

export const AREA_TYPES = ["EXCLUSIVE", "SUPPLY", "LAND", "GROSS_FLOOR"] as const;
export type AreaType = (typeof AREA_TYPES)[number];

export const AREA_TYPE_LABEL: Record<AreaType, string> = {
  EXCLUSIVE: "전용면적",
  SUPPLY: "공급면적",
  LAND: "대지면적",
  GROSS_FLOOR: "연면적",
};

export const FIELD_TYPES = ["NUMBER", "BOOLEAN", "TEXT", "DATE"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  NUMBER: "숫자",
  BOOLEAN: "참거짓",
  TEXT: "텍스트",
  DATE: "날짜",
};

export const LEASE_SOURCE_LABEL = { CONTRACT: "계약", REFERENCE: "참고" } as const;

export const OWNER_OCCUPANT_ROLE_LABEL = { OWNER: "소유자", OCCUPANT: "점유자" } as const;

export const VISIT_RESULT_LABEL = {
  COMPLETED: "방문 완료",
  NO_SHOW: "미방문",
  CANCELLED: "취소",
} as const;

export const CONTRACT_STATUS_LABEL = {
  DRAFT: "초안",
  SIGNED: "체결",
  ENDED: "종료",
  TERMINATED: "해지",
  CANCELLED: "취소",
  VOID: "무효",
} as const;

export const COORDINATION_STATUS_LABEL = {
  TIME_COLLECTING: "시간 수집 중",
  COORDINATABLE: "조율 가능",
  FINAL_CONFIRMATION_REQUIRED: "최종 확인 필요",
  APPLYING: "신청 중",
  CONFIRMED: "확정",
  RESCHEDULE_REQUIRED: "재조율 필요",
  VISIT_COMPLETED: "방문 완료",
  VISIT_INCOMPLETE: "방문 미완료",
  CANCELLED: "취소",
} as const;

export const SALE_PREMIUM_CATEGORY_NAME = "분양권";

export function labelOf(map: Readonly<Record<string, string>>, key: string | null | undefined) {
  if (key === null || key === undefined) return "-";
  return map[key] ?? key;
}

export function toneOf(
  map: Readonly<Record<string, BadgeTone>>,
  key: string | null | undefined,
): BadgeTone {
  if (key === null || key === undefined) return "gray";
  return map[key] ?? "gray";
}

export function isDealType(value: string): value is DealType {
  return (DEAL_TYPES as readonly string[]).includes(value);
}

export function isOfferStatus(value: string): value is OfferStatus {
  return (OFFER_STATUSES as readonly string[]).includes(value);
}
