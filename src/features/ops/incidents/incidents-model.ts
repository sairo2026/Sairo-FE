import {
  OpsIncidentCreateResponseSchema,
  OpsIncidentListResponseSchema,
  OpsIncidentUpdateResponseSchema,
  OpsPrivacyIncidentCreateResponseSchema,
  OpsPrivacyIncidentListResponseSchema,
  OpsPrivacyIncidentUpdateResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type {
  OpsIncidentListResponse,
  OpsPrivacyIncidentListResponse,
} from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import {
  parseIdList,
  parsePositiveInt,
  parseServiceList,
  toSeoulIso,
} from "../system-common/system-form";

export const IncidentListSchema = OpsIncidentListResponseSchema;
export const IncidentCreateSchema = OpsIncidentCreateResponseSchema;
export const IncidentUpdateSchema = OpsIncidentUpdateResponseSchema;
export const PrivacyIncidentListSchema = OpsPrivacyIncidentListResponseSchema;
export const PrivacyIncidentCreateSchema = OpsPrivacyIncidentCreateResponseSchema;
export const PrivacyIncidentUpdateSchema = OpsPrivacyIncidentUpdateResponseSchema;

export type Incident = OpsIncidentListResponse["items"][number];
export type PrivacyIncident = OpsPrivacyIncidentListResponse["items"][number];

export type IncidentStage = Incident["status"];

export const INCIDENT_STAGES: readonly IncidentStage[] = [
  "DETECTED",
  "CONFIRMED",
  "RESPONDING",
  "RECOVERED",
  "CLOSED",
];

export const INCIDENT_STATUS: OpsStatusMap = {
  DETECTED: { label: "감지", tone: "red" },
  CONFIRMED: { label: "확인", tone: "amber" },
  RESPONDING: { label: "대응", tone: "blue" },
  RECOVERED: { label: "복구", tone: "teal" },
  CLOSED: { label: "종료", tone: "gray" },
};

export const INCIDENT_STATUS_OPTIONS = [
  { value: "", label: "전체 단계" },
  ...INCIDENT_STAGES.map((stage) => ({
    value: stage,
    label: INCIDENT_STATUS[stage]?.label ?? stage,
  })),
];

export function nextStage(current: IncidentStage): IncidentStage | null {
  const index = INCIDENT_STAGES.indexOf(current);
  return INCIDENT_STAGES[index + 1] ?? null;
}

/** 현재 단계 유지 또는 바로 다음 단계만 고를 수 있다. */
export function isStageSelectable(current: IncidentStage, candidate: IncidentStage): boolean {
  return candidate === current || candidate === nextStage(current);
}

export type IncidentCreateInput = {
  title: string;
  services: string;
  officeIds: string;
  startedDate: string;
  startedTime: string;
  rootCause: string;
  assignedOperatorId: string;
};

export const EMPTY_INCIDENT_CREATE: IncidentCreateInput = {
  title: "",
  services: "",
  officeIds: "",
  startedDate: "",
  startedTime: "",
  rootCause: "",
  assignedOperatorId: "",
};

export type IncidentCreateErrors = Partial<Record<keyof IncidentCreateInput, string>>;

export const TITLE_MAX = 200;

export function validateIncidentCreate(input: IncidentCreateInput): IncidentCreateErrors {
  const errors: IncidentCreateErrors = {};
  const title = input.title.trim();
  if (title === "") errors.title = "장애 제목을 입력해 주세요.";
  else if (title.length > TITLE_MAX)
    errors.title = `장애 제목은 ${TITLE_MAX}자 이내로 입력해 주세요.`;
  if (parseServiceList(input.services).length === 0) {
    errors.services = "영향 서비스를 1개 이상 입력해 주세요.";
  }
  if (parseIdList(input.officeIds) === null) {
    errors.officeIds = "영향 사무소 번호는 쉼표로 구분한 숫자로 입력해 주세요.";
  }
  if (toSeoulIso(input.startedDate, input.startedTime) === null) {
    errors.startedDate = "장애 시작 시각을 입력해 주세요.";
  }
  const operator = input.assignedOperatorId.trim();
  if (operator !== "" && parsePositiveInt(operator) === null) {
    errors.assignedOperatorId = "담당 운영자 번호는 숫자로 입력해 주세요.";
  }
  return errors;
}

export function toIncidentCreateBody(input: IncidentCreateInput) {
  const startedAt = toSeoulIso(input.startedDate, input.startedTime);
  const operator = parsePositiveInt(input.assignedOperatorId);
  const rootCause = input.rootCause.trim();
  return {
    title: input.title.trim(),
    affectedServices: parseServiceList(input.services),
    affectedOfficeIds: parseIdList(input.officeIds) ?? [],
    startedAt: startedAt ?? "",
    ...(rootCause === "" ? {} : { rootCause }),
    ...(operator === null ? {} : { assignedOperatorId: operator }),
  };
}

export type IncidentUpdateInput = {
  status: IncidentStage;
  recoveredDate: string;
  recoveredTime: string;
  rootCause: string;
  responseActions: string;
  customerNotice: string;
  preventionTasks: string;
  summary: string;
  assignedOperatorId: string;
};

export function updateInputOf(incident: Incident): IncidentUpdateInput {
  return {
    status: incident.status,
    recoveredDate: "",
    recoveredTime: "",
    rootCause: incident.rootCause ?? "",
    responseActions: incident.responseActions ?? "",
    customerNotice: incident.customerNotice ?? "",
    preventionTasks: incident.preventionTasks ?? "",
    summary: incident.summary ?? "",
    assignedOperatorId:
      incident.assignedOperatorId === null ? "" : String(incident.assignedOperatorId),
  };
}

export type IncidentUpdateErrors = Partial<Record<keyof IncidentUpdateInput, string>>;

export function validateIncidentUpdate(
  input: IncidentUpdateInput,
  current: IncidentStage,
): IncidentUpdateErrors {
  const errors: IncidentUpdateErrors = {};
  if (!isStageSelectable(current, input.status)) {
    errors.status = "장애 단계는 한 단계씩 순서대로만 바꿀 수 있습니다.";
  }
  const hasDate = input.recoveredDate !== "";
  const hasTime = input.recoveredTime !== "";
  if ((hasDate || hasTime) && toSeoulIso(input.recoveredDate, input.recoveredTime) === null) {
    errors.recoveredDate = "복구 시각은 날짜와 시각을 모두 입력해 주세요.";
  }
  const operator = input.assignedOperatorId.trim();
  if (operator !== "" && parsePositiveInt(operator) === null) {
    errors.assignedOperatorId = "담당 운영자 번호는 숫자로 입력해 주세요.";
  }
  return errors;
}

export function toIncidentUpdateBody(input: IncidentUpdateInput) {
  const recoveredAt = toSeoulIso(input.recoveredDate, input.recoveredTime);
  const operator = parsePositiveInt(input.assignedOperatorId);
  const text = (value: string) => (value.trim() === "" ? {} : { value: value.trim() });
  const rootCause = text(input.rootCause).value;
  const responseActions = text(input.responseActions).value;
  const customerNotice = text(input.customerNotice).value;
  const preventionTasks = text(input.preventionTasks).value;
  const summary = text(input.summary).value;
  return {
    status: input.status,
    ...(recoveredAt === null ? {} : { recoveredAt }),
    ...(rootCause === undefined ? {} : { rootCause }),
    ...(responseActions === undefined ? {} : { responseActions }),
    ...(customerNotice === undefined ? {} : { customerNotice }),
    ...(preventionTasks === undefined ? {} : { preventionTasks }),
    ...(summary === undefined ? {} : { summary }),
    ...(operator === null ? {} : { assignedOperatorId: operator }),
  };
}

export type PrivacyCreateInput = {
  incidentLogId: string;
  affectedScope: string;
  reportRequirement: string;
  noticeRequirement: string;
  reportDueDate: string;
  reportDueTime: string;
  noticeDueDate: string;
  noticeDueTime: string;
};

export const EMPTY_PRIVACY_CREATE: PrivacyCreateInput = {
  incidentLogId: "",
  affectedScope: "",
  reportRequirement: "",
  noticeRequirement: "",
  reportDueDate: "",
  reportDueTime: "",
  noticeDueDate: "",
  noticeDueTime: "",
};

export type PrivacyCreateErrors = Partial<Record<keyof PrivacyCreateInput, string>>;

function dueError(date: string, time: string): string | undefined {
  if (date === "" && time === "") return undefined;
  return toSeoulIso(date, time) === null ? "기한은 날짜와 시각을 모두 입력해 주세요." : undefined;
}

export function validatePrivacyCreate(input: PrivacyCreateInput): PrivacyCreateErrors {
  const errors: PrivacyCreateErrors = {};
  if (parsePositiveInt(input.incidentLogId) === null) {
    errors.incidentLogId = "연결할 장애 번호를 숫자로 입력해 주세요.";
  }
  if (input.affectedScope.trim() === "") errors.affectedScope = "사고 대상과 범위를 입력해 주세요.";
  if (input.reportRequirement.trim() === "") {
    errors.reportRequirement = "신고 요건 판단 내용을 입력해 주세요.";
  }
  if (input.noticeRequirement.trim() === "") {
    errors.noticeRequirement = "통지 요건 판단 내용을 입력해 주세요.";
  }
  const report = dueError(input.reportDueDate, input.reportDueTime);
  if (report) errors.reportDueDate = report;
  const notice = dueError(input.noticeDueDate, input.noticeDueTime);
  if (notice) errors.noticeDueDate = notice;
  return errors;
}

export function toPrivacyCreateBody(input: PrivacyCreateInput) {
  const reportDueAt = toSeoulIso(input.reportDueDate, input.reportDueTime);
  const noticeDueAt = toSeoulIso(input.noticeDueDate, input.noticeDueTime);
  return {
    incidentLogId: parsePositiveInt(input.incidentLogId) ?? 0,
    affectedScope: input.affectedScope.trim(),
    reportRequirement: input.reportRequirement.trim(),
    noticeRequirement: input.noticeRequirement.trim(),
    ...(reportDueAt === null ? {} : { reportDueAt }),
    ...(noticeDueAt === null ? {} : { noticeDueAt }),
  };
}
