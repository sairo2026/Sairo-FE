import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/client";
import { blockedCandidateIds, blockedReasonOf } from "./schedule-blocked";

const NOW = Date.parse("2026-11-15T09:00:00+09:00");
const own = { candidatePropertyId: 1, propertyId: 501, crossOffice: false };
const cross = { candidatePropertyId: 2, propertyId: 9001, crossOffice: true };

describe("일정 저장을 막은 후보 판별", () => {
  it("서버가 알려 준 후보 번호만 읽고 잘못된 값은 버린다", () => {
    const error = new ApiError(422, {
      code: "TIME_OUT_OF_RANGE",
      message: "원문",
      candidatePropertyIds: [2, 3],
    });
    expect(blockedCandidateIds(error)).toEqual([2, 3]);
    expect(
      blockedCandidateIds(new ApiError(422, { code: "TIME_OUT_OF_RANGE", message: "x" })),
    ).toEqual([]);
  });

  it("서버가 알려 준 후보를 가장 먼저 원인으로 본다", () => {
    expect(blockedReasonOf(own, { serverIds: [1], grants: [], now: NOW })).toBe("SERVER_REPORTED");
  });

  it("허용받은 매물은 조건 등록 여부와 적용 기간으로 원인을 가린다", () => {
    const base = { propertyId: 9001, conditionRegistered: true };
    expect(
      blockedReasonOf(cross, {
        serverIds: [],
        grants: [{ ...base, conditionRegistered: false }],
        now: NOW,
      }),
    ).toBe("CONDITION_MISSING");
    expect(
      blockedReasonOf(cross, {
        serverIds: [],
        grants: [{ ...base, conditionAppliesUntil: "2026-11-14T00:00:00+09:00" }],
        now: NOW,
      }),
    ).toBe("CONDITION_EXPIRED");
    expect(
      blockedReasonOf(cross, {
        serverIds: [],
        grants: [{ ...base, conditionAppliesUntil: "2026-12-31T00:00:00+09:00" }],
        now: NOW,
      }),
    ).toBe("UNKNOWN");
  });

  it("조건 등록 여부를 알 수 없는 매물은 확인 필요로 둔다", () => {
    expect(blockedReasonOf(own, { serverIds: [], grants: undefined, now: NOW })).toBe("UNKNOWN");
    expect(blockedReasonOf(cross, { serverIds: [], grants: [], now: NOW })).toBe("UNKNOWN");
  });
});
