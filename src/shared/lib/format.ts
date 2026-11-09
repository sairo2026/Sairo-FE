const SEOUL_TIME_ZONE = "Asia/Seoul";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SEOUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SEOUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const slotFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SEOUL_TIME_ZONE,
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function joinParts(formatter: Intl.DateTimeFormat, date: Date): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    result[part.type] = part.value;
  }
  return result;
}

/** 저장된 UTC 시각을 서울 기준 "2026-11-10 14:30"으로 표시한다. */
export function formatSeoulDateTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return "-";
  const p = joinParts(dateTimeFormatter, date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

/** 서울 기준 "2026-11-10"으로 표시한다. */
export function formatSeoulDate(value: string | Date): string {
  const date = toDate(value);
  if (!date) return "-";
  const p = joinParts(dateFormatter, date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** 시간 슬롯 표시: "8월 20일 오전 10:30". 오전·오후는 로케일 데이터에 기대지 않고 직접 붙인다. */
export function formatTimeSlot(value: string | Date): string {
  const date = toDate(value);
  if (!date) return "-";
  const p = joinParts(slotFormatter, date);
  const hour24 = Number(p.hour) % 24;
  const period = hour24 < 12 ? "오전" : "오후";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${p.month}월 ${p.day}일 ${period} ${hour12}:${p.minute}`;
}

/** 금액은 원 단위 정수에 천 단위 쉼표를 붙인다. 미확인(null)은 "미확인"으로 표시한다. */
export function formatKrw(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "미확인";
  return `${Math.trunc(amount).toLocaleString("ko-KR")}원`;
}

/** 면적은 ㎡ 단위 소수 둘째 자리까지 표시한다. */
export function formatArea(area: number | null | undefined): string {
  if (area === null || area === undefined || !Number.isFinite(area)) return "미확인";
  return `${area.toFixed(2)}㎡`;
}

/** 숫자만 남기고 전화번호 하이픈을 자동으로 넣는다. */
export function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 비밀번호는 코드 포인트 기준으로 센다. */
export function countCodePoints(value: string): number {
  return Array.from(value).length;
}

export const TEXT_LIMITS = {
  title: 100,
  shortMemo: 500,
  bodyMemo: 10000,
  customFieldName: 50,
  contractMemo: 2000,
} as const;

/** 이름·제목: 앞뒤 공백을 제거한 뒤 1~100자인지 확인한다. */
export function isValidTitle(value: string): boolean {
  const length = countCodePoints(value.trim());
  return length >= 1 && length <= TEXT_LIMITS.title;
}
