import { describe, expect, it } from "vitest";
import { buildMockCondition } from "@/mocks/handlers/visit-approver";
import {
  MAX_VISITS_DEFAULT,
  conditionToForm,
  emptyConditionForm,
  emptyDateRule,
  emptyDateWindow,
  emptyRange,
  toConditionRequest,
  validateCondition,
  violatedRuleLabel,
} from "./conditions";

describe("승인자 조건 입력 모델", () => {
  it("하루 최대 횟수는 기본값 3을 채우고 나머지 숫자 조건은 비운다", () => {
    const form = emptyConditionForm(new Date("2026-11-10T00:00:00+09:00"));
    expect(form.maxVisitsPerDay).toBe(MAX_VISITS_DEFAULT);
    expect(form.minGapMinutes).toBe("");
    expect(form.minLeadMinutes).toBe("");
    expect(form.singleVisitMaxMinutes).toBe("");
    expect(form.appliesFrom).toBe("2026-11-10");
  });

  it("값이 범위를 벗어나면 항목마다 오류를 돌려준다", () => {
    const form = {
      ...emptyConditionForm(),
      maxVisitsPerDay: "21",
      minGapMinutes: "-1",
      singleVisitMaxMinutes: "0",
    };
    const errors = validateCondition(form);
    expect(errors.maxVisitsPerDay).toBe("1 이상 20 이하의 정수로 입력해 주세요.");
    expect(errors.minGapMinutes).toBeDefined();
    expect(errors.singleVisitMaxMinutes).toBe("1 이상의 정수로 입력해 주세요.");
  });

  it("종료 시각이 시작보다 늦지 않으면 오류다", () => {
    const form = emptyConditionForm();
    const range = { ...emptyRange(), start: "12:00", end: "11:00" };
    form.weekday = { 1: [range] };
    expect(validateCondition(form)[`weekday-1-${range.id}`]).toBe(
      "종료 시각은 시작 시각보다 늦어야 합니다.",
    );
  });

  it("날짜별 조건은 적용 기간 안의 날짜와 지정한 값이 필요하다", () => {
    const form = emptyConditionForm(new Date("2026-11-10T00:00:00+09:00"));
    const rule = emptyDateRule();
    rule.date = "2027-12-01";
    rule.minGapMinutes = { mode: "VALUE", value: "" };
    form.dateRules = [rule];
    const errors = validateCondition(form);
    expect(errors[`dateRule-${rule.id}`]).toBe("적용 기간 안의 날짜여야 합니다.");
    expect(errors[`dateRule-${rule.id}-minGapMinutes`]).toBe("값을 입력해 주세요.");
  });

  it("날짜별 조건의 네 항목이 모두 기본 조건 따르기면 한 가지 이상 지정하라고 안내한다", () => {
    const form = emptyConditionForm(new Date("2026-11-10T00:00:00+09:00"));
    const rule = emptyDateRule();
    rule.date = form.appliesFrom;
    form.dateRules = [rule];
    expect(validateCondition(form)[`dateRule-${rule.id}`]).toBe(
      "기본 조건과 다르게 정할 항목을 한 가지 이상 지정해 주세요.",
    );
  });

  it("요청 본문에 제한 없음과 날짜 예외와 날짜별 조건을 옮긴다", () => {
    const form = emptyConditionForm(new Date("2026-11-10T00:00:00+09:00"));
    form.maxVisitsPerDay = "";
    form.weekday = { 3: [{ id: "a", start: "10:00", end: "12:00" }] };
    const block = { ...emptyDateWindow(), date: "2026-12-24", kind: "BLOCK" as const };
    form.dateWindows = [block];
    const rule = emptyDateRule();
    rule.date = "2026-12-26";
    rule.maxVisitsPerDay = { mode: "VALUE", value: "1" };
    rule.minLeadMinutes = { mode: "UNLIMITED", value: "" };
    form.dateRules = [rule];
    const request = toConditionRequest(form, {
      impactAcknowledged: true,
      noticeVersion: "2026-11",
    });
    expect(request.maxVisitsPerDay).toBeNull();
    expect(request.appliesFrom).toBe("2026-11-10T00:00:00+09:00");
    expect(request.windows[1]).toMatchObject({
      windowType: "DATE",
      windowDate: "2026-12-24",
      startsTime: "00:00",
      endsTime: "24:00",
      isException: true,
    });
    expect(request.dateRules?.[0]).toMatchObject({
      maxVisitsPerDay: { kind: "VALUE", value: 1 },
      minGapMinutes: null,
      minLeadMinutes: { kind: "UNLIMITED", value: null },
    });
    expect(request.acknowledgedNoticeVersion).toBe("2026-11");
  });

  it("저장된 조건을 입력 값으로 되돌린다", () => {
    const condition = buildMockCondition({
      approvalId: 1,
      windows: [
        {
          windowType: "WEEKDAY",
          weekday: 3,
          windowDate: null,
          startsTime: "10:00",
          endsTime: "12:00",
          isException: false,
        },
        {
          windowType: "DATE",
          weekday: null,
          windowDate: "2026-12-24",
          startsTime: "00:00",
          endsTime: "24:00",
          isException: true,
        },
      ],
      dateRules: [{ ruleDate: "2026-12-26", maxVisitsPerDay: { kind: "UNLIMITED", value: null } }],
    });
    const form = conditionToForm(condition);
    expect(form.weekday[3]?.[0]).toMatchObject({ start: "10:00", end: "12:00" });
    expect(form.dateWindows[0]?.kind).toBe("BLOCK");
    expect(form.dateRules[0]?.maxVisitsPerDay.mode).toBe("UNLIMITED");
    expect(form.dateRules[0]?.minGapMinutes.mode).toBe("FOLLOW");
  });

  it("알 수 없는 위반 규칙 코드는 그대로 보여준다", () => {
    expect(violatedRuleLabel("MIN_GAP")).toBe("방문 간 최소 간격 위반");
    expect(violatedRuleLabel("NEW_CODE")).toBe("NEW_CODE");
  });
});
