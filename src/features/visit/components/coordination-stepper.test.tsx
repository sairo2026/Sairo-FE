// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CoordinationStepper, coordinationStepIndex } from "./coordination-stepper";

afterEach(cleanup);

describe("조율 진행 단계", () => {
  it("상태를 시안의 5단계 위치로 바꾼다", () => {
    expect(coordinationStepIndex("TIME_COLLECTING")).toBe(2);
    expect(coordinationStepIndex("COORDINATABLE")).toBe(3);
    expect(coordinationStepIndex("RESCHEDULE_REQUIRED")).toBe(3);
    expect(coordinationStepIndex("FINAL_CONFIRMATION_REQUIRED")).toBe(4);
    expect(coordinationStepIndex("APPLYING")).toBe(4);
    expect(coordinationStepIndex("CONFIRMED")).toBe(5);
    expect(coordinationStepIndex("CANCELLED")).toBeNull();
    expect(coordinationStepIndex("VISIT_INCOMPLETE")).toBeNull();
  });

  it("현재 단계만 aria-current로 알리고 지난 단계는 완료로 읽힌다", () => {
    render(<CoordinationStepper current={3} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items[3]?.getAttribute("aria-current")).toBe("step");
    expect(items[0]?.getAttribute("aria-current")).toBeNull();
    expect(items[0]?.textContent).toContain("고객·매물 선택 완료");
    expect(items[4]?.textContent).not.toContain("완료");
  });
});
