import { describe, expect, it } from "vitest";
import { formatCandidateLabel, groupCandidatesByDate } from "./visit-response";

describe("formatCandidateLabel", () => {
  it("formats a morning time", () => {
    expect(formatCandidateLabel(new Date(2026, 7, 20, 10, 30).toISOString())).toBe(
      "8월 20일 오전 10:30",
    );
  });

  it("formats an afternoon time", () => {
    expect(formatCandidateLabel(new Date(2026, 7, 20, 14, 0).toISOString())).toBe(
      "8월 20일 오후 2:00",
    );
  });
});

describe("groupCandidatesByDate", () => {
  it("groups candidates by calendar date in chronological order", () => {
    const groups = groupCandidatesByDate([
      { candidateTimeId: 3, startsAt: new Date(2026, 7, 21, 9, 0).toISOString() },
      { candidateTimeId: 1, startsAt: new Date(2026, 7, 20, 10, 0).toISOString() },
      { candidateTimeId: 2, startsAt: new Date(2026, 7, 20, 14, 0).toISOString() },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.dateHeading).toBe("8월 20일");
    expect(groups[0]?.candidates.map((c) => c.candidateTimeId)).toEqual([1, 2]);
    expect(groups[1]?.dateHeading).toBe("8월 21일");
    expect(groups[1]?.candidates.map((c) => c.candidateTimeId)).toEqual([3]);
  });
});
