import { describe, expect, it } from "vitest";
import {
  countCodePoints,
  formatArea,
  formatCount,
  formatKrw,
  formatPhone,
  formatSeoulDate,
  formatSeoulDateTime,
  formatTimeSlot,
  isValidTitle,
} from "./format";

describe("format", () => {
  it("UTC 시각을 서울 시각으로 표시한다", () => {
    expect(formatSeoulDateTime("2026-11-10T05:30:00Z")).toBe("2026-11-10 14:30");
    expect(formatSeoulDate("2026-11-10T16:00:00Z")).toBe("2026-11-11");
    expect(formatSeoulDateTime("잘못된 값")).toBe("-");
  });

  it("시간 슬롯을 월 일 오전/오후 시각으로 표시한다", () => {
    expect(formatTimeSlot("2026-08-20T01:30:00Z")).toBe("8월 20일 오전 10:30");
    expect(formatTimeSlot("2026-08-20T10:05:00Z")).toBe("8월 20일 오후 7:05");
  });

  it("금액은 원 단위 정수에 쉼표를 붙이고 미확인은 0으로 표시하지 않는다", () => {
    expect(formatKrw(1234567)).toBe("1,234,567원");
    expect(formatKrw(0)).toBe("0원");
    expect(formatCount(1234567)).toBe("1,234,567");
    expect(formatKrw(-5000)).toBe("-5,000원");
    expect(formatKrw(null)).toBe("미확인");
  });

  it("면적은 소수 둘째 자리까지 표시한다", () => {
    expect(formatArea(84.9)).toBe("84.90㎡");
    expect(formatArea(undefined)).toBe("미확인");
  });

  it("전화번호에 하이픈을 자동으로 넣는다", () => {
    expect(formatPhone("01012345678")).toBe("010-1234-5678");
    expect(formatPhone("0101234567")).toBe("010-123-4567");
    expect(formatPhone("010")).toBe("010");
    expect(formatPhone("0212345678")).toBe("02-1234-5678");
    expect(formatPhone("abc010-1234")).toBe("010-1234");
  });

  it("이름·제목은 공백 제거 후 1~100자만 허용한다", () => {
    expect(isValidTitle("   ")).toBe(false);
    expect(isValidTitle("  매물  ")).toBe(true);
    expect(isValidTitle("가".repeat(100))).toBe(true);
    expect(isValidTitle("가".repeat(101))).toBe(false);
    expect(countCodePoints("😀a")).toBe(2);
  });
});
