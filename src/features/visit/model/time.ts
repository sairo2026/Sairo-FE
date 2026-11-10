import { MAX_PERIOD_DAYS } from "./labels";

const KST_OFFSET_MS = 9 * 3_600_000;
const MS_DAY = 86_400_000;

export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * MS_DAY).toISOString().slice(0, 10);
}

export function toKstIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

export type PeriodErrors = { start?: string; end?: string };

export function validatePeriod(start: string, end: string, today: string): PeriodErrors {
  const errors: PeriodErrors = {};
  if (start === "") errors.start = "방문 가능 시작일을 입력해 주세요.";
  else if (start < today) errors.start = "시작일은 오늘 이후여야 합니다.";
  if (end === "") errors.end = "방문 가능 종료일을 입력해 주세요.";
  else if (start !== "" && end < start) errors.end = "종료일은 시작일보다 앞설 수 없습니다.";
  else if (end > addDays(today, MAX_PERIOD_DAYS))
    errors.end = "종료일은 오늘부터 30일 안이어야 합니다.";
  return errors;
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000);
}

export function kstParts(iso: string): { date: string; time: string } {
  const shifted = new Date(Date.parse(iso) + KST_OFFSET_MS).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}
