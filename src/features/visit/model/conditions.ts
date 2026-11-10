import { z } from "zod";
import type {
  ApproverConditionResponse,
  ApproverConditionUpsertRequest,
} from "@/lib/api/contracts/visit.schema";
import { addDays, todayKst } from "./time";

export type ConditionLike = Omit<
  ApproverConditionResponse,
  "normalizedRanges" | "normalizationApplied" | "privacyNotice"
>;

export const MAX_VISITS_DEFAULT = "3";
export const MAX_VISITS_RANGE = { min: 1, max: 20 } as const;
export const MAX_DATE_RULES = 366;

export const WEEKDAYS = [
  { value: 1, label: "월요일" },
  { value: 2, label: "화요일" },
  { value: 3, label: "수요일" },
  { value: 4, label: "목요일" },
  { value: 5, label: "금요일" },
  { value: 6, label: "토요일" },
  { value: 7, label: "일요일" },
] as const;

export type TimeRange = { id: string; start: string; end: string };
export type DateWindowKind = "AVAILABLE" | "EXCLUDE" | "BLOCK";
export type DateWindowRow = {
  id: string;
  date: string;
  kind: DateWindowKind;
  start: string;
  end: string;
};
export type RuleMode = "FOLLOW" | "UNLIMITED" | "VALUE";
export type RuleField = { mode: RuleMode; value: string };
export const RULE_KEYS = [
  "maxVisitsPerDay",
  "minGapMinutes",
  "minLeadMinutes",
  "singleVisitMaxMinutes",
] as const;
export type RuleKey = (typeof RULE_KEYS)[number];
export type DateRuleRow = { id: string; date: string } & Record<RuleKey, RuleField>;

export type ConditionFormValues = {
  appliesFrom: string;
  appliesUntil: string;
  maxVisitsPerDay: string;
  minGapMinutes: string;
  minLeadMinutes: string;
  singleVisitMaxMinutes: string;
  grouping: "" | "CONSECUTIVE" | "SPREAD";
  weekday: Record<number, TimeRange[]>;
  dateWindows: DateWindowRow[];
  dateRules: DateRuleRow[];
};

export type ConditionErrors = Record<string, string>;

export const RULE_LABEL: Record<RuleKey, string> = {
  maxVisitsPerDay: "하루 최대 방문 횟수",
  minGapMinutes: "방문 간 최소 간격(분)",
  minLeadMinutes: "최소 사전 신청 시간(분)",
  singleVisitMaxMinutes: "1회 허용 시간(분)",
};

const RULE_LIMIT: Record<RuleKey, { min: number; max?: number; message: string }> = {
  maxVisitsPerDay: {
    min: MAX_VISITS_RANGE.min,
    max: MAX_VISITS_RANGE.max,
    message: "1 이상 20 이하의 정수로 입력해 주세요.",
  },
  minGapMinutes: { min: 0, message: "0 이상의 정수로 입력해 주세요." },
  minLeadMinutes: { min: 0, message: "0 이상의 정수로 입력해 주세요." },
  singleVisitMaxMinutes: { min: 1, message: "1 이상의 정수로 입력해 주세요." },
};

let sequence = 0;
export function nextRowId(): string {
  sequence += 1;
  return `row-${sequence}`;
}

export function emptyRange(): TimeRange {
  return { id: nextRowId(), start: "09:00", end: "18:00" };
}

export function emptyDateWindow(): DateWindowRow {
  return { id: nextRowId(), date: "", kind: "AVAILABLE", start: "09:00", end: "18:00" };
}

export function emptyDateRule(): DateRuleRow {
  return {
    id: nextRowId(),
    date: "",
    maxVisitsPerDay: { mode: "FOLLOW", value: "" },
    minGapMinutes: { mode: "FOLLOW", value: "" },
    minLeadMinutes: { mode: "FOLLOW", value: "" },
    singleVisitMaxMinutes: { mode: "FOLLOW", value: "" },
  };
}

export function emptyConditionForm(now: Date = new Date()): ConditionFormValues {
  const today = todayKst(now);
  return {
    appliesFrom: today,
    appliesUntil: addDays(today, 90),
    maxVisitsPerDay: MAX_VISITS_DEFAULT,
    minGapMinutes: "",
    minLeadMinutes: "",
    singleVisitMaxMinutes: "",
    grouping: "",
    weekday: {},
    dateWindows: [],
    dateRules: [],
  };
}

const RuleWireSchema = z
  .object({
    kind: z.enum(["VALUE", "UNLIMITED"]).optional(),
    value: z.number().nullable().optional(),
  })
  .nullable()
  .optional();

const DateRuleWireSchema = z.object({
  ruleDate: z.string(),
  maxVisitsPerDay: RuleWireSchema,
  minGapMinutes: RuleWireSchema,
  minLeadMinutes: RuleWireSchema,
  singleVisitMaxMinutes: RuleWireSchema,
});

function toRuleField(wire: z.infer<typeof RuleWireSchema>): RuleField {
  if (!wire) return { mode: "FOLLOW", value: "" };
  if (wire.kind === "UNLIMITED") return { mode: "UNLIMITED", value: "" };
  return {
    mode: "VALUE",
    value: wire.value === null || wire.value === undefined ? "" : String(wire.value),
  };
}

function numberText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function kstDate(iso: string): string {
  return iso.slice(0, 10);
}

export function conditionToForm(condition: ConditionLike): ConditionFormValues {
  const weekday: Record<number, TimeRange[]> = {};
  const dateWindows: DateWindowRow[] = [];
  for (const window of condition.windows) {
    if (window.windowType === "WEEKDAY" && window.weekday) {
      weekday[window.weekday] = [
        ...(weekday[window.weekday] ?? []),
        { id: nextRowId(), start: window.startsTime, end: window.endsTime },
      ];
    } else if (window.windowType === "DATE" && window.windowDate) {
      const isBlock =
        window.isException && window.startsTime === "00:00" && window.endsTime === "24:00";
      dateWindows.push({
        id: nextRowId(),
        date: window.windowDate,
        kind: isBlock ? "BLOCK" : window.isException ? "EXCLUDE" : "AVAILABLE",
        start: window.startsTime,
        end: window.endsTime,
      });
    }
  }
  const dateRules: DateRuleRow[] = [];
  for (const raw of condition.dateRules) {
    const parsed = DateRuleWireSchema.safeParse(raw);
    if (!parsed.success) continue;
    dateRules.push({
      id: nextRowId(),
      date: parsed.data.ruleDate,
      maxVisitsPerDay: toRuleField(parsed.data.maxVisitsPerDay),
      minGapMinutes: toRuleField(parsed.data.minGapMinutes),
      minLeadMinutes: toRuleField(parsed.data.minLeadMinutes),
      singleVisitMaxMinutes: toRuleField(parsed.data.singleVisitMaxMinutes),
    });
  }
  return {
    appliesFrom: kstDate(condition.appliesFrom),
    appliesUntil: kstDate(condition.appliesUntil),
    maxVisitsPerDay: numberText(condition.maxVisitsPerDay),
    minGapMinutes: numberText(condition.minGapMinutes),
    minLeadMinutes: numberText(condition.minLeadMinutes),
    singleVisitMaxMinutes: numberText(condition.singleVisitMaxMinutes),
    grouping: condition.groupingPreference ?? "",
    weekday,
    dateWindows,
    dateRules,
  };
}

function isInteger(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

function checkNumber(key: RuleKey, raw: string): string | undefined {
  const text = raw.trim();
  if (text === "") return undefined;
  const limit = RULE_LIMIT[key];
  if (!isInteger(text)) return limit.message;
  const value = Number(text);
  if (value < limit.min || (limit.max !== undefined && value > limit.max)) return limit.message;
  return undefined;
}

function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function checkRange(start: string, end: string): string | undefined {
  const from = timeToMinutes(start);
  const to = timeToMinutes(end);
  if (from === null || to === null) return "시작과 종료 시각을 입력해 주세요.";
  if (from < 0 || from >= 24 * 60 || to > 24 * 60) return "시각은 00:00부터 24:00 사이여야 합니다.";
  if (to <= from) return "종료 시각은 시작 시각보다 늦어야 합니다.";
  return undefined;
}

export function validateCondition(values: ConditionFormValues): ConditionErrors {
  const errors: ConditionErrors = {};
  if (values.appliesFrom === "") errors.appliesFrom = "적용 시작일을 입력해 주세요.";
  if (values.appliesUntil === "") errors.appliesUntil = "적용 종료일을 입력해 주세요.";
  else if (values.appliesFrom !== "" && values.appliesUntil < values.appliesFrom) {
    errors.appliesUntil = "적용 종료일은 시작일보다 앞설 수 없습니다.";
  }
  for (const key of RULE_KEYS) {
    const problem = checkNumber(key, values[key]);
    if (problem) errors[key] = problem;
  }
  for (const [weekday, ranges] of Object.entries(values.weekday)) {
    for (const range of ranges) {
      const problem = checkRange(range.start, range.end);
      if (problem) errors[`weekday-${weekday}-${range.id}`] = problem;
    }
  }
  for (const row of values.dateWindows) {
    if (row.date === "") errors[`dateWindow-${row.id}`] = "날짜를 입력해 주세요.";
    else if (row.kind !== "BLOCK") {
      const problem = checkRange(row.start, row.end);
      if (problem) errors[`dateWindow-${row.id}`] = problem;
    }
  }
  if (values.dateRules.length > MAX_DATE_RULES) {
    errors.dateRules = `날짜별 필수 조건은 ${MAX_DATE_RULES}개까지 입력할 수 있습니다.`;
  }
  for (const row of values.dateRules) {
    if (row.date === "") errors[`dateRule-${row.id}`] = "날짜를 입력해 주세요.";
    else if (
      values.appliesFrom !== "" &&
      values.appliesUntil !== "" &&
      (row.date < values.appliesFrom || row.date > values.appliesUntil)
    ) {
      errors[`dateRule-${row.id}`] = "적용 기간 안의 날짜여야 합니다.";
    }
    for (const key of RULE_KEYS) {
      const field = row[key];
      if (field.mode !== "VALUE") continue;
      if (field.value.trim() === "") errors[`dateRule-${row.id}-${key}`] = "값을 입력해 주세요.";
      else {
        const problem = checkNumber(key, field.value);
        if (problem) errors[`dateRule-${row.id}-${key}`] = problem;
      }
    }
  }
  return errors;
}

function optionalNumber(raw: string): number | null {
  const text = raw.trim();
  return text === "" ? null : Number(text);
}

function toRuleBody(field: RuleField) {
  if (field.mode === "FOLLOW") return null;
  if (field.mode === "UNLIMITED") return { kind: "UNLIMITED" as const, value: null };
  return { kind: "VALUE" as const, value: Number(field.value) };
}

export function toConditionRequest(
  values: ConditionFormValues,
  options: { impactAcknowledged: boolean; noticeVersion: string },
): ApproverConditionUpsertRequest {
  const windows: ApproverConditionUpsertRequest["windows"] = [];
  for (const weekday of WEEKDAYS) {
    for (const range of values.weekday[weekday.value] ?? []) {
      windows.push({
        windowType: "WEEKDAY",
        weekday: weekday.value,
        windowDate: null,
        startsTime: range.start,
        endsTime: range.end,
        isException: false,
      });
    }
  }
  for (const row of values.dateWindows) {
    windows.push({
      windowType: "DATE",
      weekday: null,
      windowDate: row.date,
      startsTime: row.kind === "BLOCK" ? "00:00" : row.start,
      endsTime: row.kind === "BLOCK" ? "24:00" : row.end,
      isException: row.kind !== "AVAILABLE",
    });
  }
  return {
    appliesFrom: `${values.appliesFrom}T00:00:00+09:00`,
    appliesUntil: `${values.appliesUntil}T23:59:59+09:00`,
    maxVisitsPerDay: optionalNumber(values.maxVisitsPerDay),
    minGapMinutes: optionalNumber(values.minGapMinutes),
    minLeadMinutes: optionalNumber(values.minLeadMinutes),
    singleVisitMaxMinutes: optionalNumber(values.singleVisitMaxMinutes),
    groupingPreference: values.grouping === "" ? null : values.grouping,
    windows,
    dateRules: values.dateRules.map((row) => ({
      ruleDate: row.date,
      maxVisitsPerDay: toRuleBody(row.maxVisitsPerDay),
      minGapMinutes: toRuleBody(row.minGapMinutes),
      minLeadMinutes: toRuleBody(row.minLeadMinutes),
      singleVisitMaxMinutes: toRuleBody(row.singleVisitMaxMinutes),
    })),
    impactAcknowledged: options.impactAcknowledged,
    acknowledgedNoticeVersion: options.noticeVersion,
  };
}

export const VIOLATED_RULE_LABEL: Record<string, string> = {
  WINDOW_MISMATCH: "가능 시간과 맞지 않음",
  MIN_GAP: "방문 간 최소 간격 위반",
  MAX_VISITS_PER_DAY: "하루 최대 방문 횟수 초과",
  SINGLE_VISIT_MAX: "1회 허용 시간 초과",
  VALIDITY_PERIOD: "적용 기간 밖",
};

export function violatedRuleLabel(code: unknown): string {
  return typeof code === "string" ? (VIOLATED_RULE_LABEL[code] ?? code) : "조건 위반";
}
