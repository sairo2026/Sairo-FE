import type {
  CoordinationDealType,
  CoordinationStatus,
  CustomerResponseResult,
} from "../schemas/coordination.schema";

export const dealTypeLabels: Record<CoordinationDealType, string> = {
  MONTHLY: "월세",
  JEONSE: "전세",
  SALE: "매매",
};

export const coordinationStatusLabels: Record<CoordinationStatus, string> = {
  TENANT_CHECKING: "세입자 확인 중",
  BUYER_DELIVERY_REQUIRED: "구매자 전달 필요",
  BUYER_CHECKING: "구매자 확인 중",
  FINAL_CONFIRMATION_REQUIRED: "최종 확정 필요",
  SCHEDULE_CONFIRMED: "확정 완료",
  VISIT_COMPLETED: "임장 완료",
};

export const coordinationStatusBadgeClassNames: Record<CoordinationStatus, string> = {
  TENANT_CHECKING: "bg-[#ffdde3] text-[#c8102e]",
  BUYER_DELIVERY_REQUIRED: "bg-[#fff1b8] text-[#8a6100]",
  BUYER_CHECKING: "bg-[#d6f5df] text-[#177245]",
  FINAL_CONFIRMATION_REQUIRED: "bg-[#c9f7ee] text-[#0f7a68]",
  SCHEDULE_CONFIRMED: "bg-[#dbe4ff] text-[#3937b8]",
  VISIT_COMPLETED: "border border-[#dfe3ec] bg-white text-slate-500",
};

export const customerResponseResultLabels: Record<CustomerResponseResult, string> = {
  WAITING: "응답 대기 중",
  AVAILABLE_SUBMITTED: "가능 시간 제출 완료",
  NONE_AVAILABLE: "가능한 시간 없음",
  EXPIRED: "링크 만료",
  CONFIRMED: "확정",
  NOT_SELECTED: "미선택 종료",
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

export function formatCandidateLabelFromIso(isoString: string): string {
  return formatCandidateLabel(new Date(isoString));
}

export function formatShortSchedule(isoString: string): string {
  const date = new Date(isoString);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

const MILLISECONDS_PER_MINUTE = 60_000;

export function formatRemainingLinkTime(linkExpiresAtIso: string, now: Date): string {
  const remainingMinutes = Math.floor(
    (new Date(linkExpiresAtIso).getTime() - now.getTime()) / MILLISECONDS_PER_MINUTE,
  );
  if (remainingMinutes <= 0) return "링크가 만료되었습니다.";
  const days = Math.floor(remainingMinutes / (60 * 24));
  const hours = Math.floor((remainingMinutes % (60 * 24)) / 60);
  const minutes = remainingMinutes % 60;
  const parts = [
    days > 0 ? `${days}일` : null,
    hours > 0 ? `${hours}시간` : null,
    `${minutes}분`,
  ].filter((part): part is string => part !== null);
  return `${parts.join(" ")} 뒤 링크가 만료됩니다.`;
}
