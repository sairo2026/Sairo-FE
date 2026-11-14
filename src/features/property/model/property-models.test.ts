import { describe, expect, it } from "vitest";
import { daysUntil, formatOfferPrice, formatWonCompact, joinNames } from "./format";
import {
  EMPTY_PROPERTY_FORM,
  fieldRawFromValue,
  toCreateRequest,
  toFieldPayload,
  toUpdateRequest,
  validateFieldValue,
  validatePropertyForm,
} from "./form";
import type { FieldDefinition } from "./form";

const base = { ...EMPTY_PROPERTY_FORM, name: "테스트 매물", categoryId: "6" };
const create = { requireCategory: true, activate: false };

function definition(partial: Partial<FieldDefinition>): FieldDefinition {
  return {
    fieldDefinitionId: 1,
    fieldName: "해당층",
    fieldType: "NUMBER",
    numberKind: "INTEGER",
    unit: "층",
    minValue: 0,
    maxValue: null,
    active: true,
    ...partial,
  };
}

describe("금액과 만기 표시", () => {
  it("원 단위 금액을 억과 만 단위로 읽기 쉽게 바꾼다", () => {
    expect(formatWonCompact(120_000_000)).toBe("1억 2,000만원");
    expect(formatWonCompact(900_000)).toBe("90만원");
    expect(formatWonCompact(500)).toBe("500원");
    expect(formatWonCompact(0)).toBe("0원");
    expect(formatWonCompact(-30_000_000)).toBe("-3,000만원");
    expect(formatWonCompact(null)).toBe("-");
  });

  it("거래유형별 가격 문구를 만든다", () => {
    const empty = { salePrice: null, depositAmount: null, monthlyRentAmount: null };
    expect(formatOfferPrice({ ...empty, dealType: "SALE", salePrice: 300_000_000 })).toBe("3억원");
    expect(formatOfferPrice({ ...empty, dealType: "JEONSE", depositAmount: 200_000_000 })).toBe(
      "2억원",
    );
    expect(
      formatOfferPrice({
        ...empty,
        dealType: "MONTHLY",
        depositAmount: 20_000_000,
        monthlyRentAmount: 900_000,
      }),
    ).toBe("2,000만원 / 90만원");
  });

  it("서울 날짜 기준으로 남은 일수를 센다", () => {
    const now = new Date("2026-11-10T15:30:00Z");
    expect(daysUntil("2026-11-11", now)).toBe(0);
    expect(daysUntil("2026-11-20", now)).toBe(9);
    expect(daysUntil(null, now)).toBeNull();
    expect(daysUntil("날짜아님", now)).toBeNull();
  });

  it("이름이 없으면 줄표를 보여준다", () => {
    expect(joinNames([])).toBe("-");
    expect(joinNames(["김소유", "박소유"])).toBe("김소유, 박소유");
  });
});

describe("매물 입력 검증", () => {
  it("매물명과 카테고리만 있으면 임시저장할 수 있다", () => {
    expect(validatePropertyForm(base, create)).toEqual({});
  });

  it("매물명과 카테고리가 없으면 오류를 돌려준다", () => {
    const errors = validatePropertyForm(EMPTY_PROPERTY_FORM, create);
    expect(errors.name).toBe("매물명을 입력해 주세요.");
    expect(errors.categoryId).toBe("카테고리를 선택해 주세요.");
  });

  it("활성 등록에는 주소와 담당 공인중개사가 필요하다", () => {
    const errors = validatePropertyForm(base, { ...create, activate: true });
    expect(errors.address).toBeDefined();
    expect(errors.managingMembershipId).toBeDefined();
  });

  it("면적과 관리비 형식을 검사한다", () => {
    const errors = validatePropertyForm(
      { ...base, exclusiveAreaSqm: "0", supplyAreaSqm: "가나", maintenanceFeeAmount: "-1" },
      create,
    );
    expect(errors.exclusiveAreaSqm).toContain("0보다 큰 숫자");
    expect(errors.supplyAreaSqm).toBeDefined();
    expect(errors.maintenanceFeeAmount).toBeDefined();
  });

  it("참고 만기일과 출처는 함께 입력해야 한다", () => {
    expect(
      validatePropertyForm({ ...base, referenceLeaseEndDate: "2027-01-01" }, create)
        .referenceLeaseEndSource,
    ).toBeDefined();
    expect(
      validatePropertyForm({ ...base, referenceLeaseEndSource: "임대인 확인" }, create)
        .referenceLeaseEndDate,
    ).toBeDefined();
  });

  it("입주 협의와 날짜를 함께 고르면 오류다", () => {
    expect(
      validatePropertyForm({ ...base, moveInNegotiable: true, moveInDate: "2026-12-01" }, create)
        .moveInDate,
    ).toBeDefined();
  });

  it("요청 본문은 빈 값을 null로 바꾸고 수정 요청에서 카테고리를 뺀다", () => {
    const request = toCreateRequest({ ...base, name: " 이름 ", exclusiveAreaSqm: "59.8" });
    expect(request.name).toBe("이름");
    expect(request.categoryId).toBe(6);
    expect(request.address).toBeNull();
    expect(request.exclusiveAreaSqm).toBe(59.8);
    const update = toUpdateRequest(base, true);
    expect("categoryId" in update).toBe(false);
    expect(update.registrationStage).toBe("ACTIVE");
    expect(toUpdateRequest(base, false).registrationStage).toBeUndefined();
  });
});

describe("카테고리 전용 입력 검증", () => {
  it("정수 항목은 소수와 범위 밖 값을 막는다", () => {
    expect(validateFieldValue(definition({}), "12")).toBeUndefined();
    expect(validateFieldValue(definition({}), "1.5")).toBe("정수로 입력해 주세요.");
    expect(validateFieldValue(definition({}), "-1")).toBe("0층 이상으로 입력해 주세요.");
    expect(validateFieldValue(definition({}), "abc")).toBe("숫자로 입력해 주세요.");
  });

  it("퍼센트 항목은 0에서 100 사이만 받는다", () => {
    const percent = definition({
      numberKind: "DECIMAL",
      unit: "%",
      minValue: 0,
      maxValue: 100,
    });
    expect(validateFieldValue(percent, "75.5")).toBeUndefined();
    expect(validateFieldValue(percent, "101")).toBe("100% 이하로 입력해 주세요.");
  });

  it("분양권 프리미엄처럼 하한이 없는 항목은 음수를 받는다", () => {
    const premium = definition({ minValue: null, unit: "원" });
    expect(validateFieldValue(premium, "-5000000")).toBeUndefined();
  });

  it("값을 비우면 검증을 건너뛰고 저장 값은 null이다", () => {
    expect(validateFieldValue(definition({}), "")).toBeUndefined();
    expect(toFieldPayload(definition({}), " ")).toBeNull();
  });

  it("형식별로 저장 값과 입력 값을 바꾼다", () => {
    expect(toFieldPayload(definition({}), "12")).toBe(12);
    expect(toFieldPayload(definition({ fieldType: "BOOLEAN" }), "true")).toBe(true);
    expect(toFieldPayload(definition({ fieldType: "TEXT" }), " 메모 ")).toBe("메모");
    expect(fieldRawFromValue(definition({ fieldType: "BOOLEAN" }), false)).toBe("false");
    expect(fieldRawFromValue(definition({}), null)).toBe("");
    expect(fieldRawFromValue(definition({}), 7)).toBe("7");
  });
});
