import { describe, expect, it } from "vitest";
import { VisitCoordinationCancelResponseSchema } from "@/lib/api/contracts/visit.schema";
import {
  COORDINATION_STATUSES,
  PUBLIC_VISIT_STATE_LABEL,
  PUBLIC_VISIT_STATE_TONE,
  linkValidity,
  statusLabel,
  statusTone,
} from "./labels";

describe("방문 조율 상태 라벨", () => {
  it("홈의 9개 문구와 디자인 시스템의 상태 색 매핑을 그대로 유지한다", () => {
    expect(
      COORDINATION_STATUSES.map((status) => [statusLabel(status), statusTone(status)]),
    ).toEqual([
      ["시간 수집 중", "rose"],
      ["조율 가능", "orange"],
      ["최종 확정 필요", "lime"],
      ["신청 진행", "teal"],
      ["확정 완료", "mint"],
      ["재조율 필요", "violet"],
      ["방문 완료", "gray"],
      ["미방문 종료", "silver"],
      ["취소", "crimson"],
    ]);
  });

  it("상태마다 색이 서로 다르다", () => {
    const tones = COORDINATION_STATUSES.map((status) => statusTone(status));
    expect(new Set(tones).size).toBe(tones.length);
  });

  it("서버 상태값 전부가 라벨을 가진다", () => {
    const serverStatuses = VisitCoordinationCancelResponseSchema.shape.status.options;
    expect([...serverStatuses].sort()).toEqual([...COORDINATION_STATUSES].sort());
  });

  it("확정 방문 상태는 같은 개념의 조율 상태와 같은 문구·색을 쓴다", () => {
    expect(PUBLIC_VISIT_STATE_LABEL.VALID).toBe(statusLabel("CONFIRMED"));
    expect(PUBLIC_VISIT_STATE_TONE.VALID).toBe(statusTone("CONFIRMED"));
    expect(PUBLIC_VISIT_STATE_LABEL.RESCHEDULE_REQUIRED).toBe(statusLabel("RESCHEDULE_REQUIRED"));
    expect(PUBLIC_VISIT_STATE_TONE.CANCELLED).toBe(statusTone("CANCELLED"));
  });

  it("알 수 없는 상태값은 원문과 회색으로 보인다", () => {
    expect(statusLabel("UNKNOWN")).toBe("UNKNOWN");
    expect(statusTone("UNKNOWN")).toBe("gray");
  });
});

describe("링크 상태", () => {
  const now = Date.parse("2026-11-15T00:00:00+09:00");
  it("폐기가 만료보다 우선하고 만료 시각 이후는 만료다", () => {
    expect(linkValidity({ expiresAt: "2026-11-16T00:00:00+09:00", revokedAt: null }, now)).toBe(
      "ACTIVE",
    );
    expect(linkValidity({ expiresAt: "2026-11-15T00:00:00+09:00", revokedAt: null }, now)).toBe(
      "EXPIRED",
    );
    expect(
      linkValidity(
        { expiresAt: "2099-01-01T00:00:00+09:00", revokedAt: "2026-11-14T00:00:00+09:00" },
        now,
      ),
    ).toBe("REVOKED");
  });
});
