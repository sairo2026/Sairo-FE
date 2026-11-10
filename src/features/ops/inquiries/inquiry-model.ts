import type { z } from "zod";
import type {
  OpsSupportInquiryDetailResponseSchema,
  OpsSupportInquiryListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";

export type InquiryDetail = z.infer<typeof OpsSupportInquiryDetailResponseSchema>;
export type InquiryListItem = z.infer<typeof OpsSupportInquiryListResponseSchema>["items"][number];
export type InquiryMessage = InquiryDetail["messages"][number];
export type InquiryAttachment = InquiryDetail["attachments"][number];

export const CATEGORY_LABELS: Record<string, string> = {
  SIGNUP: "가입",
  AUTH: "인증",
  BUSINESS: "업무",
  BILLING: "결제",
  MIGRATION: "이전",
  PRIVACY: "개인정보",
  BUG: "오류",
  ENTERPRISE: "기업 도입",
};

export const INQUIRY_STATUS: OpsStatusMap = {
  OPEN: { label: "접수", tone: "blue" },
  ASSIGNED: { label: "담당 배정", tone: "teal" },
  WAITING_FOR_CUSTOMER: { label: "고객 답변 대기", tone: "yellow" },
  ANSWERED: { label: "답변 완료", tone: "green" },
  CLOSED: { label: "종료", tone: "gray" },
};

export const PRIORITY_STATUS: OpsStatusMap = {
  LOW: { label: "낮음", tone: "gray" },
  NORMAL: { label: "보통", tone: "blue" },
  HIGH: { label: "높음", tone: "red" },
};

export const SCAN_LABELS: Record<string, string> = {
  PENDING: "검사 중",
  CLEAN: "검사 완료",
  REJECTED: "검사 거부",
};

export const ATTACHMENT_LIMIT = 5;
export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

/** 파일 항목 오류 문구를 돌려준다. 문제가 없으면 null이다. */
export function validateAttachmentFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const typeOk = file.type === "" || ALLOWED_TYPES.includes(file.type);
  const extensionOk = ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension));
  if (!typeOk || !extensionOk) return "PDF, JPG, PNG 파일만 올릴 수 있습니다.";
  if (file.size > ATTACHMENT_MAX_BYTES) return "파일당 20MB 이하만 올릴 수 있습니다.";
  if (file.size === 0) return "빈 파일은 올릴 수 없습니다.";
  return null;
}

export function isOverdue(
  row: { status: string; responseDueAt: string; answeredAt: string | null },
  now: number,
): boolean {
  return row.answeredAt === null && row.status !== "CLOSED" && Date.parse(row.responseDueAt) < now;
}

export function attachmentsOfMessage(
  attachments: InquiryAttachment[],
  messageId: number,
): InquiryAttachment[] {
  return attachments.filter((attachment) => attachment.messageId === messageId);
}
