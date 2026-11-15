import { describe, expect, it } from "vitest";
import {
  APPROVER_UNDISCLOSED_REASON,
  BROKER_REASON_COPY,
  GENERIC_APPROVER_REASON,
  GENERIC_BROKER_REASON,
  REVALIDATION_REASON_CODES,
  TIME_CLOSED_REASON_COPY,
  approverFailureLines,
  brokerFailureReasons,
  describeRequestStatusReason,
  parseViolatedCodes,
} from "./revalidation-reasons";
import { REQUEST_RULE_LABEL } from "./request-labels";
import { VIOLATED_RULE_LABEL } from "./conditions";

/**
 * 백엔드 ApproverConditionEvaluator, VisitRequestChecker, VisitFeasibility가 내는 규칙 코드 12개와
 * ApproverSelectionExecutor가 재검증 실패 대표 코드로 쓰는 CONDITION_CHANGED를 그대로 옮긴 목록이다.
 */
const BACKEND_RULE_CODES = [
  "DEPUTY_VISIT_LOCKED",
  "CONDITION_EXPIRED",
  "NO_PERMISSION",
  "WINDOW_MISMATCH",
  "MAX_VISITS_PER_DAY",
  "MIN_GAP",
  "MIN_LEAD",
  "SINGLE_VISIT_MAX",
  "CUSTOMER_CONFLICT",
  "BROKER_CONFLICT",
  "PROPERTY_CONFLICT",
  "TRAVEL_CONFLICT",
  "CONDITION_CHANGED",
];

const BACKEND_CLOSE_REASONS = [
  "START_PASSED",
  "CONDITION_EXPIRED",
  "GRANT_REVOKED",
  "GRANT_EXPIRED",
];

const ENGLISH_CODE = /[A-Z]{3,}_[A-Z_]+/;

describe("재검증 사유 매핑", () => {
  it("백엔드의 모든 규칙 코드가 중개사 문구와 다음 행동에 매핑되어 있다", () => {
    expect([...REVALIDATION_REASON_CODES].sort()).toEqual([...BACKEND_RULE_CODES].sort());
    for (const code of BACKEND_RULE_CODES) {
      const copy = BROKER_REASON_COPY[code as keyof typeof BROKER_REASON_COPY];
      expect(copy, code).toBeDefined();
      expect(copy.reason, code).not.toMatch(ENGLISH_CODE);
      expect(copy.nextStep, code).not.toMatch(ENGLISH_CODE);
      expect(copy.nextStep.length, code).toBeGreaterThan(10);
    }
  });

  it("신청 점검 위반 사유 표와 조건 위반 라벨 표도 백엔드 코드를 빠뜨리지 않는다", () => {
    for (const code of BACKEND_RULE_CODES) {
      expect(REQUEST_RULE_LABEL[code], code).toBeTruthy();
      expect(VIOLATED_RULE_LABEL[code], code).toBeTruthy();
      expect(REQUEST_RULE_LABEL[code], code).not.toMatch(ENGLISH_CODE);
      expect(VIOLATED_RULE_LABEL[code], code).not.toMatch(ENGLISH_CODE);
    }
  });

  it("알 수 없는 코드와 빈 값은 일반 문구로 바꾼다", () => {
    expect(brokerFailureReasons("SOMETHING_NEW")).toEqual([GENERIC_BROKER_REASON]);
    expect(brokerFailureReasons(null)).toEqual([GENERIC_BROKER_REASON]);
    expect(approverFailureLines("SOMETHING_NEW")).toEqual([GENERIC_APPROVER_REASON]);
    expect(approverFailureLines(undefined, undefined)).toEqual([GENERIC_APPROVER_REASON]);
  });

  it("재검증 상세의 위반 규칙 나열에서 알려진 코드만 뽑는다", () => {
    expect(parseViolatedCodes("위반한 규칙: MIN_GAP, NOPE, BROKER_CONFLICT, MIN_GAP")).toEqual([
      "MIN_GAP",
      "BROKER_CONFLICT",
    ]);
    expect(parseViolatedCodes("MIN_GAP")).toEqual([]);
    expect(parseViolatedCodes(null)).toEqual([]);
  });

  it("중개사에게는 대표 사유와 함께 위반한 다른 항목을 중복 없이 보인다", () => {
    const reasons = brokerFailureReasons(
      "CONDITION_CHANGED",
      "위반한 규칙: WINDOW_MISMATCH, CUSTOMER_CONFLICT",
    );
    expect(reasons.map((item) => item.reason)).toEqual([
      BROKER_REASON_COPY.CONDITION_CHANGED.reason,
      BROKER_REASON_COPY.WINDOW_MISMATCH.reason,
      BROKER_REASON_COPY.CUSTOMER_CONFLICT.reason,
    ]);
  });

  it("승인자에게는 중개사·고객·다른 방문이 드러나는 사유를 하나의 일반 표현으로 묶는다", () => {
    expect(approverFailureLines("DEPUTY_VISIT_LOCKED", "위반한 규칙: DEPUTY_VISIT_LOCKED")).toEqual(
      [GENERIC_APPROVER_REASON],
    );
    for (const code of [
      "CUSTOMER_CONFLICT",
      "BROKER_CONFLICT",
      "PROPERTY_CONFLICT",
      "TRAVEL_CONFLICT",
    ]) {
      expect(approverFailureLines(code, `위반한 규칙: ${code}`)).toEqual([
        APPROVER_UNDISCLOSED_REASON,
      ]);
    }
    const mixed = approverFailureLines("BROKER_CONFLICT", "위반한 규칙: BROKER_CONFLICT, MIN_GAP");
    expect(mixed).toHaveLength(2);
    expect(mixed.join(" ")).not.toMatch(/중개사의|담당 중개사|고객의/);
    expect(mixed.join(" ")).not.toMatch(ENGLISH_CODE);
  });

  it("승인자 문구에는 백엔드 코드 어느 것도 영문 그대로 나오지 않는다", () => {
    for (const code of BACKEND_RULE_CODES) {
      expect(approverFailureLines(code).join(" "), code).not.toMatch(ENGLISH_CODE);
    }
  });

  it("신청 행 사유는 상태별로 알려진 코드만 문구로 바꾸고 내부 문장은 숨긴다", () => {
    expect(describeRequestStatusReason("REVALIDATION_FAILED", "MIN_GAP")).toBe(
      BROKER_REASON_COPY.MIN_GAP.reason,
    );
    expect(describeRequestStatusReason("REVALIDATION_FAILED", "UNKNOWN_CODE")).toBe(
      GENERIC_BROKER_REASON.reason,
    );
    expect(describeRequestStatusReason("TIME_CLOSED", "선택 12번 확정으로 시간 마감")).toBe(
      TIME_CLOSED_REASON_COPY,
    );
    for (const reason of BACKEND_CLOSE_REASONS) {
      const text = describeRequestStatusReason("EXPIRED", reason);
      expect(text, reason).toBeTruthy();
      expect(text, reason).not.toMatch(ENGLISH_CODE);
    }
    expect(describeRequestStatusReason("EXPIRED", "내부 문장")).toBeUndefined();
    expect(describeRequestStatusReason("WITHDRAWN", "고객 사정")).toBe("고객 사정");
    expect(describeRequestStatusReason("PENDING", "START_PASSED")).toBeUndefined();
  });
});
