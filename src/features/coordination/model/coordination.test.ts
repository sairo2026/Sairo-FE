import { describe, expect, it } from "vitest";
import {
  formatCandidateLabel,
  formatPhoneNumber,
  formatRemainingLinkTime,
  formatShortSchedule,
  generateTimeSlots,
  isPastSlot,
  isSameDay,
  isSameSlot,
} from "./coordination";

describe("generateTimeSlots", () => {
  it("generates 30-minute slots from 09:00 to 20:30", () => {
    const slots = generateTimeSlots(new Date(2026, 7, 20));
    expect(slots).toHaveLength(24);
    expect(slots[0]?.getHours()).toBe(9);
    expect(slots[0]?.getMinutes()).toBe(0);
    expect(slots.at(-1)?.getHours()).toBe(20);
    expect(slots.at(-1)?.getMinutes()).toBe(30);
  });

  it("keeps every slot on the same calendar day as the input", () => {
    const day = new Date(2026, 7, 20);
    const slots = generateTimeSlots(day);
    expect(slots.every((slot) => isSameDay(slot, day))).toBe(true);
  });
});

describe("isSameSlot", () => {
  it("treats identical timestamps as the same slot", () => {
    const a = new Date(2026, 7, 20, 10, 30);
    const b = new Date(2026, 7, 20, 10, 30);
    expect(isSameSlot(a, b)).toBe(true);
  });

  it("treats different timestamps as different slots", () => {
    const a = new Date(2026, 7, 20, 10, 30);
    const b = new Date(2026, 7, 20, 11, 0);
    expect(isSameSlot(a, b)).toBe(false);
  });
});

describe("isPastSlot", () => {
  it("marks a slot before now as past", () => {
    const now = new Date(2026, 7, 20, 12, 0);
    expect(isPastSlot(new Date(2026, 7, 20, 11, 0), now)).toBe(true);
  });

  it("marks a slot after now as not past", () => {
    const now = new Date(2026, 7, 20, 12, 0);
    expect(isPastSlot(new Date(2026, 7, 20, 13, 0), now)).toBe(false);
  });
});

describe("formatCandidateLabel", () => {
  it("formats a morning time in Korean", () => {
    expect(formatCandidateLabel(new Date(2026, 7, 20, 10, 30))).toBe("8월 20일 오전 10:30");
  });

  it("formats an afternoon time in Korean", () => {
    expect(formatCandidateLabel(new Date(2026, 7, 20, 14, 0))).toBe("8월 20일 오후 2:00");
  });
});

describe("formatShortSchedule", () => {
  it("formats an ISO string as MM/DD HH:mm", () => {
    expect(formatShortSchedule(new Date(2026, 7, 22, 19, 30).toISOString())).toBe("08/22 19:30");
  });
});

describe("formatPhoneNumber", () => {
  it("formats a mobile number as 3-4-4", () => {
    expect(formatPhoneNumber("01032672194")).toBe("010-3267-2194");
  });

  it("formats a Seoul landline as 2-3-4", () => {
    expect(formatPhoneNumber("029101458")).toBe("02-910-1458");
  });

  it("formats a non-Seoul landline as 3-3-4", () => {
    expect(formatPhoneNumber("0319466908")).toBe("031-946-6908");
  });

  it("reformats an already-hyphenated number the same way", () => {
    expect(formatPhoneNumber("010-1234-5678")).toBe("010-1234-5678");
  });

  it("leaves a partially typed number without a trailing hyphen group", () => {
    expect(formatPhoneNumber("0103")).toBe("010-3");
  });

  it("returns an empty string when there are no digits", () => {
    expect(formatPhoneNumber("")).toBe("");
  });
});

describe("formatRemainingLinkTime", () => {
  it("reports days, hours, and minutes remaining", () => {
    const now = new Date(2026, 7, 20, 0, 0, 0);
    const expiresAt = new Date(2026, 7, 26, 3, 2, 0).toISOString();
    expect(formatRemainingLinkTime(expiresAt, now)).toBe("6일 3시간 2분 뒤 링크가 만료됩니다.");
  });

  it("reports expiry once the deadline has passed", () => {
    const now = new Date(2026, 7, 20, 0, 0, 0);
    const expiresAt = new Date(2026, 7, 19, 0, 0, 0).toISOString();
    expect(formatRemainingLinkTime(expiresAt, now)).toBe("링크가 만료되었습니다.");
  });
});
