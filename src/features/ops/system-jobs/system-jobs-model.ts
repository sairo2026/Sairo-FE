import {
  OpsSystemJobListResponseSchema,
  OpsSystemJobRerunResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsSystemJobListResponse } from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import type { OpsRole } from "../model/roles";

export const SystemJobListSchema = OpsSystemJobListResponseSchema;
export const SystemJobRerunSchema = OpsSystemJobRerunResponseSchema;
export type SystemJobRun = OpsSystemJobListResponse["items"][number];

/** 백엔드 작업 이름 형식(소문자로 시작하는 소문자·숫자·하이픈). */
export const JOB_NAME_PATTERN = /^[a-z][a-z0-9-]{0,99}$/;

export const JOB_NAME_LABELS: Record<string, string> = {
  "billing-first-charge": "첫 결제",
  "billing-renewal": "정기 결제",
  "billing-retry": "결제 재시도",
  "billing-reconciliation": "결제 대사",
  "ops-announcement-publish": "공지 발행",
  "ops-integration-check": "외부 연동 점검",
  "retention-sweep": "보관 기간 정리",
  "approver-anonymize": "승인자 개인정보 익명화",
  "legal-link-log-purge": "링크 접속 기록 정리",
  "consent-notice-send": "수신 설정 변경 통지 발송",
  "marketing-reconfirm-scan": "광고성 수신 동의 2년 재확인",
  "tax-document-pending-scan": "세금 증빙 발급 대기 생성",
  "guest-intake-deadline-scan": "비회원 권리 요청 기한 점검",
};

export function jobNameLabel(jobName: string): string {
  return JOB_NAME_LABELS[jobName] ?? "-";
}

export const JOB_STATUS: OpsStatusMap = {
  RUNNING: { label: "진행 중", tone: "blue" },
  SUCCESS: { label: "성공", tone: "green" },
  FAILED: { label: "실패", tone: "red" },
};

export const JOB_STATUS_OPTIONS = [
  { value: "", label: "전체 결과" },
  { value: "RUNNING", label: "진행 중" },
  { value: "SUCCESS", label: "성공" },
  { value: "FAILED", label: "실패" },
];

type RerunRole = Extract<OpsRole, "PRIVACY" | "BILLING" | "OPS">;

export const RERUN_ROLE_TABLE: { role: RerunRole; label: string; targets: string }[] = [
  { role: "BILLING", label: "결제담당", targets: "청구 재시도" },
  { role: "OPS", label: "운영담당", targets: "공지 발행, 외부 연동 점검" },
  { role: "PRIVACY", label: "개인정보담당", targets: "보관 기간 정리" },
];

export type RerunBlock = "SUCCESS" | "RUNNING" | "NOT_RERUNNABLE" | "NO_ROLE" | null;

export function rerunBlock(run: SystemJobRun, roles: readonly OpsRole[]): RerunBlock {
  if (run.status === "SUCCESS") return "SUCCESS";
  if (run.status === "RUNNING") return "RUNNING";
  if (run.rerunRoles.length === 0) return "NOT_RERUNNABLE";
  return run.rerunRoles.some((role) => roles.includes(role as OpsRole)) ? null : "NO_ROLE";
}

export const RERUN_BLOCK_MESSAGE: Record<Exclude<RerunBlock, null>, string> = {
  SUCCESS: "이미 성공한 실행은 다시 실행할 수 없습니다.",
  RUNNING: "진행 중인 실행은 다시 실행할 수 없습니다.",
  NOT_RERUNNABLE: "재실행 대상이 아닌 작업입니다.",
  NO_ROLE: "이 작업 종류를 재실행할 수 있는 역할이 아닙니다.",
};
