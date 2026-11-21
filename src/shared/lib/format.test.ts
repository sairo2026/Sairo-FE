import { describe, expect, it } from "vitest";
import {
  countCodePoints,
  formatArea,
  formatCount,
  formatDDay,
  formatKrw,
  formatPhone,
  formatSeoulDate,
  formatSeoulDateTime,
  formatTimeSlot,
  isContactNumber,
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

  it.each([
    "1".repeat(15),
    "1".repeat(16),
    "02" + "1".repeat(9),
    "+82 (10) 1234-5678",
    "1".repeat(7) + "-".repeat(24),
    "１２３４５６７",
    "123a4567",
    "123\t4567",
  ])("업무 연락처 입력은 검증 전에 값을 바꾸지 않는다", (input) => {
    expect(formatPhone(input, true)).toBe(input);
  });

  it("국가번호를 허용하지 않는 입력은 +를 지우고 숫자만 남긴다", () => {
    expect(formatPhone("+8210")).toBe("821-0");
  });

  it("연락처 형식은 서버 규칙과 같다", () => {
    expect(isContactNumber("010-1234-5678")).toBe(true);
    expect(isContactNumber(" +82 10 1234 5678 ")).toBe(true);
    expect(isContactNumber("(02) 123-4567")).toBe(true);
    expect(isContactNumber("123456")).toBe(false);
    expect(isContactNumber("1234567890123456")).toBe(false);
    expect(isContactNumber("82+10-1234-5678")).toBe(false);
    expect(isContactNumber("010-1234-5678".padEnd(31, "-"))).toBe(false);
    expect(isContactNumber("")).toBe(false);
  });

  it.each([
    ["1".repeat(6), false],
    ["1".repeat(7), true],
    ["1".repeat(15), true],
    ["1".repeat(16), false],
    ["1".repeat(7).padEnd(30, "-"), true],
    ["1".repeat(7).padEnd(31, "-"), false],
    ["+82 (10) 1234-5678", true],
    ["１２３４５６７", false],
    ["123\t4567", false],
    ["\u00a01234567", false],
    ["\u30001234567 ", true],
  ])("연락처의 길이와 문자 경계는 서버 규칙을 따른다", (input, valid) => {
    expect(isContactNumber(formatPhone(input, true))).toBe(valid);
  });

  it("이름·제목은 공백 제거 후 1~100자만 허용한다", () => {
    expect(isValidTitle("   ")).toBe(false);
    expect(isValidTitle("  매물  ")).toBe(true);
    expect(isValidTitle("가".repeat(100))).toBe(true);
    expect(isValidTitle("가".repeat(101))).toBe(false);
    expect(countCodePoints("😀a")).toBe(2);
  });
});

describe("formatDDay", () => {
  it("만기 전은 D-n, 당일은 D-0, 지난 뒤는 D+n으로 쓴다", () => {
    expect(formatDDay(90)).toBe("D-90");
    expect(formatDDay(0)).toBe("D-0");
    expect(formatDDay(-1)).toBe("D+1");
  });
});
