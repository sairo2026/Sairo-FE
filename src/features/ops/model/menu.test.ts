import { describe, expect, it } from "vitest";
import { requiredRolesFor, visibleMenu } from "./menu";

describe("운영 메뉴 역할", () => {
  it("연동 설정 목록은 운영담당에게만 보이고 열린다", () => {
    expect(visibleMenu(["PRIVACY"]).map((item) => item.key)).not.toContain("integrations");
    expect(visibleMenu(["OPS"]).map((item) => item.key)).toContain("integrations");
    expect(requiredRolesFor("/ops/integrations")).toEqual(["OPS"]);
  });

  it("계약 사본 화면은 개인정보담당에게도 열린다", () => {
    expect(requiredRolesFor("/ops/integrations/1/contract-copies")).toEqual(["OPS", "PRIVACY"]);
  });

  it("메뉴 접두사에 속한 하위 경로는 메뉴 역할을 따른다", () => {
    expect(requiredRolesFor("/ops/billing/refunds")).toEqual(["BILLING"]);
    expect(requiredRolesFor("/ops/audit-log")).toEqual(["SECURITY_ADMIN"]);
  });

  it("메뉴에 없는 경로는 화면 쪽 가드에 맡긴다", () => {
    expect(requiredRolesFor("/ops/unknown")).toEqual([]);
  });
});
