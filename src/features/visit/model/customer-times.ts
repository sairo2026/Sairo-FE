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
      : { errors, formError: "가능한 시간을 한 개 이상 추가해 주세요." };
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
