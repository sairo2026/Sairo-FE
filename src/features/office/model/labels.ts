import type { BadgeTone } from "@/shared/components/ui/badge";

export const REGISTRATION_STATUS_LABEL = {
  DRAFT: "작성 중",
  PENDING_REVIEW: "심사 중",
  SUPPLEMENT_REQUESTED: "보완 요청",
  APPROVED: "인증 완료",
  REJECTED: "반려",
  REVOKED: "회수",
  CANCELLED: "취소",
} as const;

export const REGISTRATION_STATUS_TONE: Record<keyof typeof REGISTRATION_STATUS_LABEL, BadgeTone> = {
  DRAFT: "gray",
  PENDING_REVIEW: "blue",
  SUPPLEMENT_REQUESTED: "yellow",
  APPROVED: "green",
  REJECTED: "red",
  REVOKED: "red",
  CANCELLED: "gray",
};

export const MEMBERSHIP_STATUS_LABEL = {
  APPROVED: "승인",
  PENDING: "승인 대기",
  REJECTED: "거절",
  REVOKED: "회수",
  CANCELLED: "취소",
  SUSPENDED: "접근 정지",
  EXPIRED: "만료",
} as const;

export const MEMBERSHIP_STATUS_TONE: Record<keyof typeof MEMBERSHIP_STATUS_LABEL, BadgeTone> = {
  APPROVED: "green",
  PENDING: "blue",
  REJECTED: "red",
  REVOKED: "red",
  CANCELLED: "gray",
  SUSPENDED: "yellow",
  EXPIRED: "gray",
};

export const TRANSFER_STATUS_LABEL = {
  PENDING: "대기",
  ACCEPTED: "수락",
  UNDER_REVIEW: "심사",
  COMPLETED: "완료",
  REJECTED: "거절",
  WITHDRAWN: "철회",
  EXPIRED: "만료",
} as const;

export const ROLE_LABEL = {
  OWNER: "대표",
  AGENT: "소속공인중개사",
  DEPUTY: "중개보조원",
} as const;

export const REQUEST_SOURCE_LABEL = {
  REQUEST: "참여 요청",
  INVITE: "대표 초대",
  REGISTRATION: "사무소 등록",
  TRANSFER: "대표 이전",
} as const;

export const ENTITY_TYPE_LABEL = {
  INDIVIDUAL: "개인",
  CORPORATION: "법인",
} as const;

export const CHANGE_TYPE_LABEL = {
  ADDRESS: "주소 변경",
  REGISTRATION_INFO: "등록관계 변경",
  REPRESENTATIVE: "대표자 변경",
} as const;

export const CHANGE_STATUS_LABEL = {
  PENDING_REVIEW: "심사 중",
  APPROVED: "승인",
  REJECTED: "반려",
} as const;

export const CONFIRMATION_SOURCE_LABEL = {
  REGISTRATION_DOC: "등록 서류",
  MANUAL_ENTRY: "직접 입력",
} as const;

export const EVIDENCE_TYPES = [
  { type: "BROKERAGE_LICENSE", label: "중개사무소 개설등록증", corporationOnly: false },
  { type: "BUSINESS_CERTIFICATE", label: "중개사무소 사업자등록증", corporationOnly: false },
  { type: "REPRESENTATIVE_QUALIFICATION", label: "공인중개사 자격증", corporationOnly: false },
  { type: "CORPORATE_AUTHORITY", label: "법인 대표권한 확인자료", corporationOnly: true },
  { type: "REGISTRATION_RELATION", label: "신청자 등록관계 확인자료", corporationOnly: true },
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number]["type"];

export const APPLICANT_RELATION_OPTIONS = [
  { value: "대표 본인", label: "대표 본인" },
  { value: "법인 대표권한자", label: "법인 대표권한자" },
];

export function labelOf(table: Record<string, string>, key: string | null | undefined): string {
  if (key && key in table) return table[key] ?? key;
  return key ?? "-";
}
