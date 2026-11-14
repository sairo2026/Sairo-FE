import { describe, expect, it } from "vitest";
import { validateRequestForm } from "./request-form";
import type { RequestFormValues } from "./request-form";

const slots = [{ startsAt: "2026-11-12T10:00:00+09:00", endsAt: "2026-11-12T14:00:00+09:00" }];

function values(partial: Partial<RequestFormValues> = {}): RequestFormValues {
  return {
    slotIndex: 0,
    date: "2026-11-12",
    startTime: "10:00",
    endTime: "10:30",
    duration: "30",
    partySize: "",
    note: "",
    ...partial,
  };
}

describe("방문 신청 입력 검증", () => {
  it("구간 안의 올바른 입력은 서울 시각 요청으로 바꾼다", () => {
    const result = validateRequestForm(values({ partySize: "2", note: " 오전 선호 " }), slots);
    expect(result.body).toEqual({
      requestedStartAt: "2026-11-12T10:00:00+09:00",
      requestedEndAt: "2026-11-12T10:30:00+09:00",
      expectedDurationMinutes: 30,
      partySize: 2,
      requestNote: "오전 선호",
    });
  });

  it("구간을 고르지 않으면 막는다", () => {
    expect(validateRequestForm(values({ slotIndex: null }), slots).errors.slotIndex).toBeDefined();
  });

  it("종료가 시작보다 늦지 않으면 막는다", () => {
    expect(validateRequestForm(values({ endTime: "10:00" }), slots).errors.endTime).toBeDefined();
  });

  it("선택한 구간 밖이면 막는다", () => {
    expect(
      validateRequestForm(values({ startTime: "09:00" }), slots).errors.startTime,
    ).toBeDefined();
    expect(
      validateRequestForm(values({ endTime: "15:00", duration: "30" }), slots).errors.startTime,
    ).toBeDefined();
  });

  it("소요시간은 양의 정수이고 희망 시간대보다 길 수 없다", () => {
    expect(validateRequestForm(values({ duration: "0" }), slots).errors.duration).toBeDefined();
    expect(validateRequestForm(values({ duration: "abc" }), slots).errors.duration).toBeDefined();
    expect(validateRequestForm(values({ duration: "60" }), slots).errors.duration).toBeDefined();
  });

  it("방문 인원과 요청사항을 검사한다", () => {
    expect(validateRequestForm(values({ partySize: "0" }), slots).errors.partySize).toBeDefined();
    expect(
      validateRequestForm(values({ note: "가".repeat(501) }), slots).errors.note,
    ).toBeDefined();
    expect(validateRequestForm(values({ note: "010 1234 5678" }), slots).errors.note).toBeDefined();
  });
});
