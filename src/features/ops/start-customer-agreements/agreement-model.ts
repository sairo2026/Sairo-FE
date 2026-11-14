import type { OpsStatusMap } from "../components/common/ops-status-badge";

export const AGREEMENT_STATUS: OpsStatusMap = {
  REGISTERED: { label: "등록됨", tone: "blue" },
  APPROVED: { label: "승인됨", tone: "green" },
  REVOKED: { label: "취소됨", tone: "gray" },
};

export const DEFAULT_GUARANTEE_MONTHS = 12;

export type AgreementForm = {
  officeId: string;
  trialEventId: string;
  priceScheduleId: string;
  guaranteeMonths: string;
  contractedOn: string;
  contractReference: string;
  weeklyUseConfirmed: boolean;
  monthlyInterviewConfirmed: boolean;
  casePublicationConsent: boolean;
  agreementTextVersion: string;
};

export const EMPTY_FORM: AgreementForm = {
  officeId: "",
  trialEventId: "",
  priceScheduleId: "",
  guaranteeMonths: String(DEFAULT_GUARANTEE_MONTHS),
  contractedOn: "",
  contractReference: "",
  weeklyUseConfirmed: false,
  monthlyInterviewConfirmed: false,
  casePublicationConsent: false,
  agreementTextVersion: "",
};

export type AgreementErrors = Partial<Record<keyof AgreementForm, string>>;

function positiveInt(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function validateAgreementForm(form: AgreementForm): AgreementErrors {
  const errors: AgreementErrors = {};
  if (positiveInt(form.officeId) === null)
    errors.officeId = "대상 사무소 ID를 숫자로 입력해 주세요.";
  if (positiveInt(form.trialEventId) === null) {
    errors.trialEventId = "시작 고객 이벤트를 선택해 주세요.";
  }
  if (positiveInt(form.priceScheduleId) === null) {
    errors.priceScheduleId = "시작 고객 가격 버전 ID를 숫자로 입력해 주세요.";
  }
  const months = positiveInt(form.guaranteeMonths);
  if (months === null || months > 24) {
    errors.guaranteeMonths = "가격 보장 개월 수는 1에서 24 사이로 입력해 주세요.";
  }
  if (form.contractedOn === "") errors.contractedOn = "체결일을 입력해 주세요.";
  const reference = form.contractReference.trim();
  if (reference === "" || reference.length > 100) {
    errors.contractReference = "합의서 참조번호를 100자 이내로 입력해 주세요.";
  }
  if (!form.weeklyUseConfirmed) errors.weeklyUseConfirmed = "주간 사용 확인이 필요합니다.";
  if (!form.monthlyInterviewConfirmed) {
    errors.monthlyInterviewConfirmed = "월 1회 피드백 인터뷰 확인이 필요합니다.";
  }
  const version = form.agreementTextVersion.trim();
  if (version === "" || version.length > 20) {
    errors.agreementTextVersion = "합의서 문안 버전을 20자 이내로 입력해 주세요.";
  }
  return errors;
}
