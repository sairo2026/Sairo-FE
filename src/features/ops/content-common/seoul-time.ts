const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const DAY_MS = 86_400_000;

export type SeoulDateTime = { date: string; time: string };

export const EMPTY_DATE_TIME: SeoulDateTime = { date: "", time: "" };

export function toSeoulIso(value: SeoulDateTime): string | null {
  if (!DATE.test(value.date) || !TIME.test(value.time)) return null;
  const iso = `${value.date}T${value.time}:00+09:00`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

export function toSeoulParts(iso: string | null | undefined): SeoulDateTime {
  if (!iso) return EMPTY_DATE_TIME;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return EMPTY_DATE_TIME;
  const shifted = new Date(parsed.getTime() + 9 * 3_600_000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

export function isFutureIso(iso: string, now: number = Date.now()): boolean {
  return Date.parse(iso) > now;
}

export function isAtLeastDaysBefore(
  noticeIso: string,
  effectiveIso: string,
  days: number,
): boolean {
  return Date.parse(effectiveIso) - Date.parse(noticeIso) >= days * DAY_MS;
}

export function isPositiveInt(value: string): boolean {
  if (!/^\d+$/.test(value.trim())) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0;
}
