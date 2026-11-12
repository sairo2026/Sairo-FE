import { z } from "zod";
import {
  OpsSystemJobListResponseSchema,
  OpsSystemJobRerunResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import type { OpsRole } from "../model/roles";

/**
 * 백엔드는 항목마다 작업 종류와 재실행할 수 있는 역할을 준다(OpsSystemResponses.SystemJobItem).
 * 재실행 대상이 아니면 rerunRoles가 빈 배열이다. 명세 표에는 아직 없어 값이 없을 수 있게 받는다.
 */
const SystemJobRunSchema = OpsSystemJobListResponseSchema.shape.items.element.extend({
  jobType: z.string().optional(),
  rerunRoles: z.array(z.string()).optional(),
});

export const SystemJobListSchema = OpsSystemJobListResponseSchema.extend({
  items: z.array(SystemJobRunSchema),
});
export const SystemJobRerunSchema = OpsSystemJobRerunResponseSchema;
export type SystemJobRun = z.infer<typeof SystemJobRunSchema>;

/** 백엔드 작업 이름 형식(소문자로 시작하는 소문자·숫자·하이픈). */
export const JOB_NAME_PATTERN = /^[a-z][a-z0-9-]{0,99}$/;

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

type RerunRole = Extract<OpsRole, "MIGRATION" | "PRIVACY" | "BILLING" | "OPS">;

export const RERUN_ROLE_TABLE: { role: RerunRole; label: string; targets: string }[] = [
  { role: "MIGRATION", label: "이전담당", targets: "데이터 이전 실행" },
  { role: "PRIVACY", label: "개인정보담당", targets: "파기, 원문 반환 전달" },
  { role: "BILLING", label: "결제담당", targets: "청구 재시도, 환불 실행" },
  { role: "OPS", label: "운영담당", targets: "공지 발행, 외부 연동 점검" },
];

const JOB_KIND_PATTERNS: { role: RerunRole; pattern: RegExp }[] = [
  { role: "MIGRATION", pattern: /^MIGRATION/ },
  { role: "PRIVACY", pattern: /^(PRIVACY|DELETION|RAW_RETURN)/ },
  { role: "BILLING", pattern: /^(BILLING|INVOICE|REFUND)/ },
  { role: "OPS", pattern: /^(NOTICE|INTEGRATION)/ },
];

/** 작업 이름으로 재실행에 필요한 역할을 판단한다. 알 수 없는 이름은 null이며 서버가 판정한다. */
export function jobKindRole(jobName: string): RerunRole | null {
  return JOB_KIND_PATTERNS.find((entry) => entry.pattern.test(jobName))?.role ?? null;
}

export type RerunBlock = "SUCCESS" | "RUNNING" | "NOT_RERUNNABLE" | "NO_ROLE" | null;

export function rerunBlock(run: SystemJobRun, roles: readonly OpsRole[]): RerunBlock {
  if (run.status === "SUCCESS") return "SUCCESS";
  if (run.status === "RUNNING") return "RUNNING";
  if (run.rerunRoles !== undefined) {
    if (run.rerunRoles.length === 0) return "NOT_RERUNNABLE";
    return run.rerunRoles.some((role) => roles.includes(role as OpsRole)) ? null : "NO_ROLE";
  }
  const needed = jobKindRole(run.jobName);
  const allowed =
    needed === null
      ? RERUN_ROLE_TABLE.some((entry) => roles.includes(entry.role))
      : roles.includes(needed);
  return allowed ? null : "NO_ROLE";
}

export const RERUN_BLOCK_MESSAGE: Record<Exclude<RerunBlock, null>, string> = {
  SUCCESS: "이미 성공한 실행은 다시 실행할 수 없습니다.",
  RUNNING: "진행 중인 실행은 다시 실행할 수 없습니다.",
  NOT_RERUNNABLE: "재실행 대상이 아닌 작업입니다.",
  NO_ROLE: "이 작업 종류를 재실행할 수 있는 역할이 아닙니다.",
};
