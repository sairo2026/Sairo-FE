import { describe, expect, it } from "vitest";
import { parsePublicVisitResponse } from "./visit-response.schema";

function baseResponse(overrides: Record<string, unknown> = {}) {
  return {
    officeName: "사이로중개사무소",
    propertySummary: {
      address: "서울특별시 성북구 정릉로 123",
      propertyName: null,
      dealType: "MONTHLY",
    },
    role: "TENANT",
    result: "WAITING",
    candidateTimes: [{ candidateTimeId: 1, startsAt: "2026-09-15T01:30:00Z" }],
    selectedCandidateIds: [],
    scheduledAt: null,
    expiresAt: "2026-09-20T00:00:00Z",
    ...overrides,
  };
}

describe("parsePublicVisitResponse", () => {
  it("parses a waiting response", () => {
    expect(parsePublicVisitResponse(baseResponse())).toEqual(baseResponse());
  });

  it("parses a confirmed response with a scheduled time", () => {
    const value = baseResponse({ result: "CONFIRMED", scheduledAt: "2026-09-15T01:30:00Z" });
    expect(parsePublicVisitResponse(value)).toEqual(value);
  });

  it("rejects an unsupported result value", () => {
    expect(() => parsePublicVisitResponse(baseResponse({ result: "CANCELLED" }))).toThrow();
  });

  it("rejects a malformed candidate time list", () => {
    expect(() =>
      parsePublicVisitResponse(baseResponse({ candidateTimes: [{ candidateTimeId: "1" }] })),
    ).toThrow();
  });
});
