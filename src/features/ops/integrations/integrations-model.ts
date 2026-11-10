import {
  OpsIntegrationCheckResponseSchema,
  OpsIntegrationListResponseSchema,
  OpsIntegrationUpdateResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsIntegrationListResponse } from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";

export const IntegrationListSchema = OpsIntegrationListResponseSchema;
export const IntegrationUpdateSchema = OpsIntegrationUpdateResponseSchema;
export const IntegrationCheckSchema = OpsIntegrationCheckResponseSchema;

export type Integration = OpsIntegrationListResponse["items"][number];

export const ENVIRONMENT_LABELS: Record<string, string> = {
  TEST: "시험",
  PRODUCTION: "운영",
};

export const ENVIRONMENT_OPTIONS = [
  { value: "", label: "전체 환경" },
  { value: "TEST", label: "시험" },
  { value: "PRODUCTION", label: "운영" },
];

export const CHECK_RESULT: OpsStatusMap = {
  SUCCESS: { label: "성공", tone: "green" },
  FAILED: { label: "실패", tone: "red" },
  NOT_TESTED: { label: "검사 전", tone: "gray" },
};

export const CONTRACT_STATUS: OpsStatusMap = {
  PENDING: { label: "체결 전", tone: "amber" },
  SIGNED: { label: "체결", tone: "green" },
  EXPIRED: { label: "만료", tone: "red" },
  TERMINATED: { label: "해지", tone: "gray" },
};

export const CONSENT_STATUS: OpsStatusMap = {
  NOT_REQUIRED: { label: "동의 불필요", tone: "gray" },
  PENDING: { label: "동의 대기", tone: "amber" },
  GRANTED: { label: "동의 완료", tone: "green" },
  WITHDRAWN: { label: "동의 철회", tone: "red" },
};

function optionsOf(map: OpsStatusMap) {
  return Object.entries(map).map(([value, entry]) => ({ value, label: entry.label }));
}

export const CONTRACT_OPTIONS = optionsOf(CONTRACT_STATUS);
export const CONSENT_OPTIONS = optionsOf(CONSENT_STATUS);

export const FIELD_MAX = 100;

export type IntegrationEditInput = {
  enabled: boolean;
  provider: string;
  processingRegion: string;
  retentionPolicy: string;
  contractStatus: string;
  consentStatus: string;
  contractNoticeReviewed: boolean;
};

export type IntegrationEditErrors = Partial<Record<keyof IntegrationEditInput, string>>;

export function editInputOf(row: Integration): IntegrationEditInput {
  return {
    enabled: row.enabled,
    provider: row.provider,
    processingRegion: row.processingRegion ?? "",
    retentionPolicy: row.retentionPolicy,
    contractStatus: row.contractStatus,
    consentStatus: row.consentStatus,
    contractNoticeReviewed: false,
  };
}

export function validateIntegrationEdit(input: IntegrationEditInput): IntegrationEditErrors {
  const errors: IntegrationEditErrors = {};
  const provider = input.provider.trim();
  if (provider === "") errors.provider = "공급자를 입력해 주세요.";
  else if (provider.length > FIELD_MAX)
    errors.provider = `공급자는 ${FIELD_MAX}자 이내로 입력해 주세요.`;
  if (input.processingRegion.trim().length > FIELD_MAX) {
    errors.processingRegion = `처리지역은 ${FIELD_MAX}자 이내로 입력해 주세요.`;
  }
  if (input.retentionPolicy.trim() === "") {
    errors.retentionPolicy = "보유기간과 파기 기준을 입력해 주세요.";
  }
  return errors;
}

/** 바뀐 값만 담는다. 계약·고지 점검은 체크했을 때만 참으로 보낸다. */
export function toIntegrationPatchBody(row: Integration, input: IntegrationEditInput) {
  const provider = input.provider.trim();
  const region = input.processingRegion.trim();
  const policy = input.retentionPolicy.trim();
  return {
    enabled: input.enabled,
    ...(provider !== row.provider ? { provider } : {}),
    ...(region !== "" && region !== (row.processingRegion ?? "")
      ? { processingRegion: region }
      : {}),
    ...(policy !== row.retentionPolicy ? { retentionPolicy: policy } : {}),
    ...(input.contractStatus !== row.contractStatus
      ? { contractStatus: input.contractStatus }
      : {}),
    ...(input.consentStatus !== row.consentStatus ? { consentStatus: input.consentStatus } : {}),
    ...(input.contractNoticeReviewed ? { contractNoticeReviewed: true } : {}),
  };
}

export function isDestinationChange(
  row: Integration,
  body: ReturnType<typeof toIntegrationPatchBody>,
): boolean {
  return "provider" in body || "processingRegion" in body || (body.enabled && !row.enabled);
}
