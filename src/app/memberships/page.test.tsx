import { describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));

import Page from "./page";

describe("초대 메일 주소", () => {
  it("/memberships는 참여 요청 상태 화면으로 이동한다", () => {
    expect(() => Page()).toThrow("redirect:/office/membership");
    expect(redirect).toHaveBeenCalledWith("/office/membership");
  });
});
