import { countCodePoints } from "@/shared/lib/format";
import { hasFinalConsonant, objectParticle, topicParticle } from "@/shared/lib/korean";

export { hasFinalConsonant, objectParticle, topicParticle };
import { EVIDENCE_TYPES } from "./labels";
import type { EvidenceType } from "./labels";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

import { EVIDENCE_NOTICE_COPY } from "./legal-copy";

export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
const EVIDENCE_MIME_PATTERN = /^(image\/(png|jpe?g)|application\/pdf)$/i;
const EVIDENCE_EXTENSION_PATTERN = /\.(png|jpe?g|pdf)$/i;
const PHONE_PATTERN = /^0\d{1,2}-\d{3,4}-\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EntityType = "INDIVIDUAL" | "CORPORATION";

export type RegistrationValues = {
  entityType: EntityType;
  registrationAuthority: string;
  realEstateLicenseNumber: string;
  businessRegistrationNumber: string;
  requestedOfficeName: string;
  requestedRepresentativeName: string;
  requestedRepresentativePhone: string;
  requestedAddress: string;
  applicantRegistrationRelation: string;
};

export type RegistrationField = keyof RegistrationValues;

function tooLong(value: string, max: number): boolean {
  return countCodePoints(value.trim()) > max;
}

function requiredText(value: string, max: number, label: string): string | undefined {
  if (value.trim() === "") return `${objectParticle(label)} 입력해 주세요.`;
  if (tooLong(value, max)) return `${topicParticle(label)} ${max}자 이하로 입력해 주세요.`;
  return undefined;
}

export function formatBusinessNumber(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function validateRegistration(values: RegistrationValues): FieldErrors<RegistrationField> {
  const errors: FieldErrors<RegistrationField> = {};
  const checks: Array<[RegistrationField, string | undefined]> = [
    ["registrationAuthority", requiredText(values.registrationAuthority, 100, "등록관청")],
    ["realEstateLicenseNumber", requiredText(values.realEstateLicenseNumber, 30, "개설등록번호")],
    ["requestedOfficeName", requiredText(values.requestedOfficeName, 100, "사무소명")],
    [
      "requestedRepresentativeName",
      requiredText(values.requestedRepresentativeName, 50, "대표자 이름"),
    ],
    ["requestedAddress", requiredText(values.requestedAddress, 300, "중개사무소 주소")],
  ];
  for (const [field, message] of checks) if (message) errors[field] = message;

  if (values.businessRegistrationNumber.replace(/\D/g, "").length !== 10) {
    errors.businessRegistrationNumber = "사업자등록번호 10자리를 입력해 주세요.";
  }
  if (!PHONE_PATTERN.test(values.requestedRepresentativePhone)) {
    errors.requestedRepresentativePhone = "연락처를 010-0000-0000 형식으로 입력해 주세요.";
  }
  if (values.applicantRegistrationRelation.trim() === "") {
    errors.applicantRegistrationRelation = "신청자의 등록관계를 선택해 주세요.";
  }
  return errors;
}

export type LookupField = "registrationAuthority" | "realEstateLicenseNumber";

export function validateLookup(values: Record<LookupField, string>): FieldErrors<LookupField> {
  const errors: FieldErrors<LookupField> = {};
  const authority = requiredText(values.registrationAuthority, 100, "등록관청");
  const license = requiredText(values.realEstateLicenseNumber, 30, "개설등록번호");
  if (authority) errors.registrationAuthority = authority;
  if (license) errors.realEstateLicenseNumber = license;
  return errors;
}

export function validateEvidenceFile(file: File): string | null {
  const typeOk =
    EVIDENCE_MIME_PATTERN.test(file.type) || EVIDENCE_EXTENSION_PATTERN.test(file.name);
  if (!typeOk) return EVIDENCE_NOTICE_COPY.errors.format;
  if (file.size > EVIDENCE_MAX_BYTES) return "파일은 한 장당 10MB 이하여야 합니다.";
  if (file.size === 0) return "비어 있는 파일입니다.";
  return null;
}

export function requiredEvidenceTypes(entityType: EntityType) {
  return EVIDENCE_TYPES.filter((item) => entityType === "CORPORATION" || !item.corporationOnly);
}

export function missingEvidence(
  entityType: EntityType,
  files: Partial<Record<EvidenceType, File>>,
): EvidenceType[] {
  return requiredEvidenceTypes(entityType)
    .filter((item) => !files[item.type])
    .map((item) => item.type);
}

export type MembershipRole = "AGENT" | "DEPUTY";

export type QualificationValues = {
  role: MembershipRole;
  qualificationNumber: string;
  employmentReportConfirmed: boolean;
  trainingConfirmed: boolean;
};

export type QualificationField =
  "qualificationNumber" | "employmentReportConfirmed" | "trainingConfirmed";

export function validateQualification(
  values: QualificationValues,
): FieldErrors<QualificationField> {
  const errors: FieldErrors<QualificationField> = {};
  if (values.role === "AGENT" && values.qualificationNumber.trim() === "") {
    errors.qualificationNumber = "자격증 번호를 입력해 주세요.";
  } else if (tooLong(values.qualificationNumber, 50)) {
    errors.qualificationNumber = "자격증 번호는 50자 이하로 입력해 주세요.";
  }
  if (!values.employmentReportConfirmed) {
    errors.employmentReportConfirmed = "고용신고 확인에 체크해 주세요.";
  }
  if (!values.trainingConfirmed) {
    errors.trainingConfirmed =
      values.role === "AGENT"
        ? "필요 교육 이수 확인에 체크해 주세요."
        : "직무교육 이수 확인에 체크해 주세요.";
  }
  return errors;
}

export function qualificationBody(values: QualificationValues) {
  return {
    ...(values.role === "AGENT" ? { qualificationNumber: values.qualificationNumber.trim() } : {}),
    employmentReportConfirmed: values.employmentReportConfirmed,
    trainingConfirmed: values.trainingConfirmed,
  };
}

export function validateInvite(values: {
  email: string;
  role: string;
}): FieldErrors<"email" | "role"> {
  const errors: FieldErrors<"email" | "role"> = {};
  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "이메일 주소를 올바르게 입력해 주세요.";
  }
  if (values.role !== "AGENT" && values.role !== "DEPUTY") errors.role = "역할을 선택해 주세요.";
  return errors;
}

export function validateReason(value: string, label = "사유"): string | undefined {
  if (value.trim() === "") return `${objectParticle(label)} 입력해 주세요.`;
  if (countCodePoints(value.trim()) > 500) {
    return `${topicParticle(label)} 500자 이하로 입력해 주세요.`;
  }
  return undefined;
}

export type RosterValues = {
  personName: string;
  legalQualification: string;
  employmentStartDate: string;
  confirmationSource: string;
};

export type RosterField = keyof RosterValues;

export function validateRoster(values: RosterValues): FieldErrors<RosterField> {
  const errors: FieldErrors<RosterField> = {};
  const name = requiredText(values.personName, 50, "이름");
  if (name) errors.personName = name;
  if (values.legalQualification !== "AGENT" && values.legalQualification !== "DEPUTY") {
    errors.legalQualification = "법적 신분을 선택해 주세요.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.employmentStartDate)) {
    errors.employmentStartDate = "업무개시일을 입력해 주세요.";
  }
  if (
    values.confirmationSource !== "REGISTRATION_DOC" &&
    values.confirmationSource !== "MANUAL_ENTRY"
  ) {
    errors.confirmationSource = "확인 출처를 선택해 주세요.";
  }
  return errors;
}

export function validateChangeRequest(
  changeType: string,
  values: Record<string, string>,
): FieldErrors<string> {
  const errors: FieldErrors<string> = {};
  const need = (key: string, label: string, max: number) => {
    const message = requiredText(values[key] ?? "", max, label);
    if (message) errors[key] = message;
  };
  if (changeType === "ADDRESS") {
    need("address", "새 주소", 300);
  } else if (changeType === "REPRESENTATIVE") {
    need("representativeName", "새 대표자 이름", 50);
    if (!PHONE_PATTERN.test(values.representativePhone ?? "")) {
      errors.representativePhone = "연락처를 010-0000-0000 형식으로 입력해 주세요.";
    }
  } else if (changeType === "REGISTRATION_INFO") {
    const keys = ["registrationAuthority", "realEstateLicenseNumber", "businessRegistrationNumber"];
    if (keys.every((key) => (values[key] ?? "").trim() === "")) {
      errors.registrationAuthority = "바꿀 항목을 한 가지 이상 입력해 주세요.";
    }
    const biz = values.businessRegistrationNumber ?? "";
    if (biz.trim() !== "" && biz.replace(/\D/g, "").length !== 10) {
      errors.businessRegistrationNumber = "사업자등록번호 10자리를 입력해 주세요.";
    }
  } else {
    errors.changeType = "변경 종류를 선택해 주세요.";
  }
  return errors;
}

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value);
}
