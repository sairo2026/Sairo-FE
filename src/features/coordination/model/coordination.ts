import type { CoordinationDealType } from "../schemas/coordination.schema";

export const dealTypeLabels: Record<CoordinationDealType, string> = {
  MONTHLY: "월세",
  JEONSE: "전세",
  SALE: "매매",
};

export const MAX_CANDIDATE_TIMES = 10;
const SLOT_START_HOUR = 9;
const SLOT_END_HOUR = 21;
const SLOT_MINUTES = 30;

export function generateTimeSlots(date: Date): Date[] {
  const slots: Date[] = [];
  for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      const slot = new Date(date);
      slot.setHours(hour, minute, 0, 0);
      slots.push(slot);
    }
  }
  return slots;
}

export function isSameSlot(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

export function isPastSlot(slot: Date, now: Date): boolean {
  return slot.getTime() < now.getTime();
}

export function formatCandidateLabel(date: Date): string {
  const hours24 = date.getHours();
  const period = hours24 < 12 ? "오전" : "오후";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${period} ${hours12}:${minutes}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
