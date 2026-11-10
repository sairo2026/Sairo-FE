import { minutesBetween, toKstIso } from "./time";

export type RequestSlot = { startsAt: string; endsAt: string };

export type RequestFormValues = {
  slotIndex: number | null;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  partySize: string;
  note: string;
};

export type RequestFormErrors = Partial<Record<keyof RequestFormValues, string>>;

export type RequestBody = {
  requestedStartAt: string;
  requestedEndAt: string;
  expectedDurationMinutes: number;
  partySize: number | null;
  requestNote: string | null;
};

const PHONE_PATTERN = /01\d[-\s]?\d{3,4}[-\s]?\d{4}/;
export const NOTE_MAX_LENGTH = 500;

export function validateRequestForm(
  values: RequestFormValues,
  slots: readonly RequestSlot[],
): { errors: RequestFormErrors; body: RequestBody | null } {
  const errors: RequestFormErrors = {};
  const slot = values.slotIndex === null ? undefined : slots[values.slotIndex];
  if (!slot) errors.slotIndex = "신청할 구간을 선택해 주세요.";
  if (values.date === "") errors.date = "방문 날짜를 입력해 주세요.";
  if (values.startTime === "") errors.startTime = "시작 시각을 입력해 주세요.";
  if (values.endTime === "") errors.endTime = "종료 시각을 입력해 주세요.";
  let startIso = "";
  let endIso = "";
  if (!errors.date && !errors.startTime && !errors.endTime) {
    startIso = toKstIso(values.date, values.startTime);
    endIso = toKstIso(values.date, values.endTime);
    if (Date.parse(endIso) <= Date.parse(startIso)) {
      errors.endTime = "종료 시각은 시작 시각보다 늦어야 합니다.";
    } else if (
      slot &&
      (Date.parse(startIso) < Date.parse(slot.startsAt) ||
        Date.parse(endIso) > Date.parse(slot.endsAt))
    ) {
      errors.startTime = "선택한 신청 가능 구간 안에서 입력해 주세요.";
    }
  }
  const duration = Number(values.duration);
  if (!/^\d+$/.test(values.duration.trim()) || duration < 1) {
    errors.duration = "예상 소요시간을 1분 이상의 숫자로 입력해 주세요.";
  } else if (startIso !== "" && endIso !== "" && duration > minutesBetween(startIso, endIso)) {
    errors.duration = "예상 소요시간은 희망 시간대보다 길 수 없습니다.";
  }
  if (values.partySize.trim() !== "" && !/^[1-9]\d{0,2}$/.test(values.partySize.trim())) {
    errors.partySize = "방문 인원은 1 이상의 숫자로 입력해 주세요.";
  }
  if (values.note.length > NOTE_MAX_LENGTH) {
    errors.note = `요청사항은 ${NOTE_MAX_LENGTH}자 이내로 입력해 주세요.`;
  } else if (PHONE_PATTERN.test(values.note)) {
    errors.note = "고객의 연락처는 요청사항에 넣을 수 없습니다.";
  }
  if (Object.keys(errors).length > 0) return { errors, body: null };
  return {
    errors,
    body: {
      requestedStartAt: startIso,
      requestedEndAt: endIso,
      expectedDurationMinutes: duration,
      partySize: values.partySize.trim() === "" ? null : Number(values.partySize),
      requestNote: values.note.trim() === "" ? null : values.note.trim(),
    },
  };
}
