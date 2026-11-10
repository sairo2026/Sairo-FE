import { z } from "zod";
import {
  OperatorRegistrationDetailResponseSchema,
  OperatorRegistrationListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";

export const RegistrationListSchema = OperatorRegistrationListResponseSchema;

export const RegistrationDetailSchema = OperatorRegistrationDetailResponseSchema.extend({
  officeId: z.number().nullable().optional(),
});
export type RegistrationDetail = z.infer<typeof RegistrationDetailSchema>;

export const ChecklistResponseSchema = z.object({
  registrationId: z.number(),
  revisionNo: z.number(),
  reviewChecklist: RegistrationDetailSchema.shape.reviewChecklist,
  canApprove: z.boolean(),
});

export const ChangeRequestListSchema = z.object({
  items: z.array(
    z.object({
      requestId: z.number(),
      officeId: z.number(),
      requestedByMembershipId: z.number(),
      changeType: z.enum(["ADDRESS", "REGISTRATION_INFO", "REPRESENTATIVE"]),
      requestedValues: z.record(z.string(), z.unknown()),
      status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED"]),
      reviewedAt: z.string().nullable(),
      rejectionReason: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type ChangeRequestItem = z.infer<typeof ChangeRequestListSchema>["items"][number];

export const REGISTRATION_STATUS: OpsStatusMap = {
  DRAFT: { label: "작성 중", tone: "gray" },
  PENDING_REVIEW: { label: "심사 대기", tone: "blue" },
  SUPPLEMENT_REQUESTED: { label: "보완 요청", tone: "amber" },
  APPROVED: { label: "승인", tone: "green" },
  REJECTED: { label: "반려", tone: "red" },
  REVOKED: { label: "인증 회수", tone: "red" },
  CANCELLED: { label: "신청 취소", tone: "gray" },
};

export const CHANGE_STATUS: OpsStatusMap = {
  PENDING_REVIEW: { label: "심사 대기", tone: "blue" },
  APPROVED: { label: "승인", tone: "green" },
  REJECTED: { label: "반려", tone: "red" },
};

export const CHANGE_TYPE_LABELS: Record<string, string> = {
  ADDRESS: "주소",
  REGISTRATION_INFO: "등록정보",
  REPRESENTATIVE: "대표자",
};

export const CHANGE_VALUE_LABELS: Record<string, string> = {
  address: "주소",
  businessRegistrationNumber: "사업자등록번호",
  realEstateLicenseNumber: "개설등록번호",
  registrationAuthority: "개설등록관청",
  representativeName: "대표자명",
  representativePhone: "대표 연락처",
};

export const EVIDENCE_LABELS: Record<string, string> = {
  BROKERAGE_LICENSE: "중개사무소 개설등록증",
  BUSINESS_CERTIFICATE: "사업자등록증",
  REPRESENTATIVE_QUALIFICATION: "대표 자격 서류",
  CORPORATE_AUTHORITY: "법인 대표 권한 서류",
  REGISTRATION_RELATION: "등록관계 확인 서류",
};

export const CHECKLIST_ITEMS = [
  {
    code: "REVISION_MATCH",
    label: "제출 버전 확인",
    hint: "심사 중인 제출 버전과 신청 값이 같은지 확인합니다.",
  },
  {
    code: "SOURCE_VERIFIED",
    label: "확인 출처 조회",
    hint: "공공 확인 출처에서 등록 사실을 조회했습니다. 조회 결과는 저장하지 않고 확인했음만 기록합니다.",
  },
  {
    code: "REGISTRATION_RELATION",
    label: "등록관계 확인",
    hint: "신청자와 사무소의 등록관계를 확인했습니다.",
  },
  {
    code: "QUALIFICATION_EDUCATION",
    label: "자격·교육 확인",
    hint: "대표 자격과 교육 이수를 확인했습니다.",
  },
  {
    code: "EMPLOYMENT_ROSTER",
    label: "고용명부 대조",
    hint: "고용명부 원본과 대조했습니다. 대조 결과는 저장하지 않고 확인했음만 기록합니다.",
  },
] as const;

export const DOWNLOADABLE_STATUSES: readonly string[] = ["PENDING_REVIEW", "SUPPLEMENT_REQUESTED"];

export const REVIEW_DUE_HOURS = 72;

export function isReviewOverdue(status: string, createdAt: string, now: number): boolean {
  if (status !== "PENDING_REVIEW") return false;
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && now - created > REVIEW_DUE_HOURS * 3_600_000;
}

/** 서울 시각의 날짜와 시각 입력을 오프셋이 붙은 ISO 문자열로 합친다. */
export function toSeoulIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  return `${date}T${time}:00+09:00`;
}
