import {
  ProviderContractCopyListResponseSchema,
  ProviderContractCopyResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { ProviderContractCopyListResponse } from "@/lib/api/contracts/ops.schema";
import { toSeoulIso } from "../system-common/system-form";

export const ContractCopyListSchema = ProviderContractCopyListResponseSchema;
export const ContractCopyCreatedSchema = ProviderContractCopyResponseSchema;

export type ContractCopy = ProviderContractCopyListResponse["items"][number];

export const DOCUMENT_KIND_LABELS: Record<string, string> = {
  SERVICE_CONTRACT: "서비스 계약",
  PROCESSING_TERMS: "처리 조건",
  SUBPROCESSOR_NOTICE: "재수탁자 고지",
  OTHER: "기타",
};

export const DOCUMENT_KIND_OPTIONS = [
  { value: "", label: "문서 종류를 선택해 주세요" },
  ...Object.entries(DOCUMENT_KIND_LABELS).map(([value, label]) => ({ value, label })),
];

export const VERSION_MAX = 40;
export const STORAGE_KEY_MAX = 300;
const SHA256 = /^[0-9a-fA-F]{64}$/;

export type CopyInput = {
  documentKind: string;
  versionLabel: string;
  signedOn: string;
  validUntil: string;
  storageKey: string;
  contentSha256: string;
  notifiedDate: string;
  notifiedTime: string;
};

export const EMPTY_COPY_INPUT: CopyInput = {
  documentKind: "",
  versionLabel: "",
  signedOn: "",
  validUntil: "",
  storageKey: "",
  contentSha256: "",
  notifiedDate: "",
  notifiedTime: "",
};

export type CopyErrors = Partial<Record<keyof CopyInput, string>>;

export function validateCopy(input: CopyInput): CopyErrors {
  const errors: CopyErrors = {};
  if (!(input.documentKind in DOCUMENT_KIND_LABELS))
    errors.documentKind = "문서 종류를 선택해 주세요.";
  const version = input.versionLabel.trim();
  if (version === "") errors.versionLabel = "버전 이름을 입력해 주세요.";
  else if (version.length > VERSION_MAX) {
    errors.versionLabel = `버전 이름은 ${VERSION_MAX}자 이내로 입력해 주세요.`;
  }
  if (input.signedOn !== "" && input.validUntil !== "" && input.validUntil < input.signedOn) {
    errors.validUntil = "유효 종료일은 체결일 이후여야 합니다.";
  }
  const key = input.storageKey.trim();
  if (key === "") errors.storageKey = "비공개 저장소의 저장 키를 입력해 주세요.";
  else if (key.length > STORAGE_KEY_MAX) {
    errors.storageKey = `저장 키는 ${STORAGE_KEY_MAX}자 이내로 입력해 주세요.`;
  }
  if (!SHA256.test(input.contentSha256.trim())) {
    errors.contentSha256 = "64자리 16진수 해시를 입력해 주세요.";
  }
  const hasNotified = input.notifiedDate !== "" || input.notifiedTime !== "";
  if (hasNotified && toSeoulIso(input.notifiedDate, input.notifiedTime) === null) {
    errors.notifiedDate = "고지 일시는 날짜와 시각을 모두 입력해 주세요.";
  }
  return errors;
}

export function toCopyBody(input: CopyInput) {
  const notified = toSeoulIso(input.notifiedDate, input.notifiedTime);
  return {
    documentKind: input.documentKind,
    versionLabel: input.versionLabel.trim(),
    storageKey: input.storageKey.trim(),
    contentSha256: input.contentSha256.trim().toLowerCase(),
    ...(input.signedOn === "" ? {} : { signedOn: input.signedOn }),
    ...(input.validUntil === "" ? {} : { validUntil: input.validUntil }),
    ...(notified === null ? {} : { subprocessorChangeNotifiedAt: notified }),
  };
}
