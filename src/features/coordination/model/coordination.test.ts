import { describe, expect, it } from "vitest";
import {
  formatCandidateLabel,
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
