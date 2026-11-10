import {
  TermsHashCheckListResponseSchema,
  TermsHashCheckRunResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type {
  TermsHashCheckListResponse,
  TermsHashCheckRunResponse,
} from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";

export const TermsHashListSchema = TermsHashCheckListResponseSchema;
export const TermsHashRunSchema = TermsHashCheckRunResponseSchema;

export type TermsHashRow = TermsHashCheckListResponse["items"][number];
export type TermsHashRun = TermsHashCheckRunResponse;

export const MISMATCH_WARNING =
  "게시된 약관 원문이 등록 시점과 다릅니다. 게시를 멈추고 원문을 확인해 주세요.";

export const HASH_RESULT: OpsStatusMap = {
  MATCH: { label: "일치", tone: "green" },
  MISMATCH: { label: "불일치", tone: "red" },
  ERROR: { label: "오류", tone: "amber" },
};

export const TERMS_STATUS: OpsStatusMap = {
  ACTIVE: { label: "시행 중", tone: "green" },
  SCHEDULED: { label: "시행 예정", tone: "blue" },
};

export function hasMismatch(rows: readonly TermsHashRow[], run: TermsHashRun | null): boolean {
  return rows.some((row) => row.lastResult === "MISMATCH") || (run?.mismatchCount ?? 0) > 0;
}
