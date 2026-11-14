import { z } from "zod";
import { toKstIso } from "./time";

export const MAX_CUSTOMER_SLOTS = 50;

export type SlotDraft = { key: number; date: string; start: string; end: string };

export type SlotErrors = Record<number, string | undefined>;

const SubmittedSlotsSchema = z.array(z.object({ startsAt: z.string(), endsAt: z.string() }));

export function parseSubmittedSlots(raw: unknown): Array<{ startsAt: string; endsAt: string }> {
  const parsed = SubmittedSlotsSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

/** 백엔드가 고객 응답을 받는 조율 상태(CoordinationStatus.acceptsCustomerResponse). */
export const CUSTOMER_RESPONSE_STATUSES = [
  "TIME_COLLECTING",
  "COORDINATABLE",
  "FINAL_CONFIRMATION_REQUIRED",
  "RESCHEDULE_REQUIRED",
];

export function acceptsCustomerResponse(
  status: string,
  linkExpiresAt: string,
  now: Date = new Date(),
): boolean {
  if (!CUSTOMER_RESPONSE_STATUSES.includes(status)) return false;
  const expires = Date.parse(linkExpiresAt);
  return Number.isNaN(expires) || expires > now.getTime();
}

/**
 * 빈 목록은 이미 제출한 시간을 모두 거두는 제출 취소다(allowEmpty). 처음 제출할 때는 한 개 이상 받는다.
 */
export function validateSlots(
  slots: SlotDraft[],
  window: { startDate: string; endDate: string },
  now: Date = new Date(),
  allowEmpty = false,
): { errors: SlotErrors; formError?: string } {
  const errors: SlotErrors = {};
  if (slots.length === 0) {
    return allowEmpty
      ? { errors }
      : { errors, formError: "가능한 시간을 한 개 이상 선택해 주세요." };
  }
  if (slots.length > MAX_CUSTOMER_SLOTS) {
    return { errors, formError: `가능한 시간은 ${MAX_CUSTOMER_SLOTS}개까지 보낼 수 있습니다.` };
  }
  for (const slot of slots) {
    if (slot.date === "" || slot.start === "" || slot.end === "") {
      errors[slot.key] = "날짜와 시작·종료 시각을 모두 입력해 주세요.";
    } else if (slot.end <= slot.start) {
      errors[slot.key] = "종료 시각은 시작 시각보다 늦어야 합니다.";
    } else if (slot.date < window.startDate || slot.date > window.endDate) {
      errors[slot.key] =
        `방문 가능 기간(${window.startDate} ~ ${window.endDate}) 안에서 골라 주세요.`;
    } else if (Date.parse(toKstIso(slot.date, slot.start)) <= now.getTime()) {
      errors[slot.key] = "지난 시간은 보낼 수 없습니다.";
    }
  }
  return { errors };
}

export function toSubmitSlots(slots: SlotDraft[]) {
  return slots.map((slot) => ({
    startsAt: toKstIso(slot.date, slot.start),
    endsAt: toKstIso(slot.date, slot.end),
  }));
}

export const SLOT_MINUTES = 30;
export const SELECT_START_MINUTES = 9 * 60;
export const SELECT_END_MINUTES = 21 * 60;
const MAX_WINDOW_DAYS = 62;

/** 날짜(YYYY-MM-DD)별로 고른 30분 칸의 시작 분(0시 기준). */
export type SelectedBlocks = Record<string, number[]>;

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function weekdayLabel(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return WEEKDAY_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "";
}

export function listWindowDates(window: { startDate: string; endDate: string }): string[] {
  const dates: string[] = [];
  let cursor = window.startDate;
  while (cursor <= window.endDate && dates.length < MAX_WINDOW_DAYS) {
    dates.push(cursor);
    cursor = new Date(Date.parse(cursor) + 86_400_000).toISOString().slice(0, 10);
  }
  return dates;
}

export function slotStartTimes(): number[] {
  const starts: number[] = [];
  for (let m = SELECT_START_MINUTES; m < SELECT_END_MINUTES; m += SLOT_MINUTES) starts.push(m);
  return starts;
}

export function minutesToTime(minutes: number): string {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

function timeToMinutes(time: string): number {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return hour * 60 + minute;
}

/** 서버에 저장된 구간을 30분 칸으로 나눈다. 칸에 맞지 않는 시각은 바깥으로 넓혀 맞춘다. */
export function rangesToBlocks(slots: Array<{ date: string; start: string; end: string }>) {
  const blocks: SelectedBlocks = {};
  for (const slot of slots) {
    const start = Math.max(
      SELECT_START_MINUTES,
      Math.floor(timeToMinutes(slot.start) / SLOT_MINUTES) * SLOT_MINUTES,
    );
    const end = Math.min(
      SELECT_END_MINUTES,
      Math.ceil(timeToMinutes(slot.end) / SLOT_MINUTES) * SLOT_MINUTES,
    );
    const set = new Set(blocks[slot.date] ?? []);
    for (let m = start; m < end; m += SLOT_MINUTES) set.add(m);
    if (set.size > 0) blocks[slot.date] = [...set].sort((a, b) => a - b);
  }
  return blocks;
}

/** 이어진 칸은 하나의 구간으로 합쳐 제출 형식으로 바꾼다. */
export function blocksToDrafts(blocks: SelectedBlocks): SlotDraft[] {
  const drafts: SlotDraft[] = [];
  for (const date of Object.keys(blocks).sort()) {
    const starts = [...(blocks[date] ?? [])].sort((a, b) => a - b);
    let runStart: number | null = null;
    let previous = 0;
    const close = () => {
      if (runStart === null) return;
      drafts.push({
        key: drafts.length,
        date,
        start: minutesToTime(runStart),
        end: minutesToTime(previous + SLOT_MINUTES),
      });
    };
    for (const start of starts) {
      if (runStart !== null && start !== previous + SLOT_MINUTES) {
        close();
        runStart = null;
      }
      if (runStart === null) runStart = start;
      previous = start;
    }
    close();
  }
  return drafts;
}

/** "10월 18일 10:00~12:00, 14:00~14:30" 형태의 요약. */
export function summarizeDrafts(drafts: SlotDraft[]): string {
  const byDate = new Map<string, string[]>();
  for (const draft of drafts) {
    byDate.set(draft.date, [...(byDate.get(draft.date) ?? []), `${draft.start}~${draft.end}`]);
  }
  return [...byDate.entries()]
    .map(([date, ranges]) => {
      const [, month = "", day = ""] = date.split("-");
      return `${Number(month)}월 ${Number(day)}일 ${ranges.join(", ")}`;
    })
    .join(" / ");
}
