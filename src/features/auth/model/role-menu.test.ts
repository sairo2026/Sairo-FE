import { describe, expect, it } from "vitest";
import type { AuthContextResponse } from "@/lib/api/contracts/common.schema";
import type { AccessCondition, OfficeRole } from "./access-policy";
import { decideAccess } from "./access-policy";
import { OFFICE_MENU_CONFIG, getOfficeMenu, resolveActiveMenu } from "./role-menu";

function context(accessCondition: AccessCondition, role: OfficeRole): AuthContextResponse {
  return {
    accessCondition,
    officeId: 1,
    role,
    pendingRegistrationId: null,
    pendingMembershipId: null,
    unresolvedRejection: null,
    graceUntil: null,
    returnPeriodEndsAt: null,
    restrictionReason: null,
    removalReason: null,
    reconsentRequired: false,
  };
}

function menuFor(role: OfficeRole, condition?: AccessCondition) {
  const canOpen = condition
    ? (href: string) => decideAccess(context(condition, role), href).kind === "allow"
    : undefined;
  return getOfficeMenu(role, canOpen);
}

function summary(role: OfficeRole, condition?: AccessCondition) {
  return menuFor(role, condition).map((item) => ({
    key: item.key,
    href: item.href,
    tabs: item.tabs?.map((tab) => tab.key),
  }));
}

describe("활성 상태의 역할별 메뉴와 탭", () => {
  it("대표는 일곱 개 메뉴를 보고 데이터 관리는 이전부터, 사무소 관리는 월말결산부터 연다", () => {
    expect(summary("OWNER")).toEqual([
      { key: "home", href: "/home", tabs: undefined },
      { key: "properties", href: "/properties", tabs: undefined },
      { key: "customers", href: "/customers", tabs: undefined },
      { key: "coordinations", href: "/coordinations", tabs: undefined },
      { key: "contracts", href: "/contracts", tabs: undefined },
      { key: "data", href: "/import", tabs: ["import", "exports"] },
      {
        key: "office",
        href: "/settlements",
        tabs: ["settlements", "members", "office-info", "verification", "billing"],
      },
    ]);
  });

  it("소속공인중개사는 내보내기와 월말결산·구성원만 본다", () => {
    expect(summary("AGENT")).toEqual([
      { key: "home", href: "/home", tabs: undefined },
      { key: "properties", href: "/properties", tabs: undefined },
      { key: "customers", href: "/customers", tabs: undefined },
      { key: "coordinations", href: "/coordinations", tabs: undefined },
      { key: "contracts", href: "/contracts", tabs: undefined },
      { key: "data", href: "/exports", tabs: ["exports"] },
      { key: "office", href: "/settlements", tabs: ["settlements", "members"] },
    ]);
  });

  it("중개보조원은 데이터 관리를 보지 못하고 사무소 관리는 구성원 목록으로 연다", () => {
    expect(summary("DEPUTY")).toEqual([
      { key: "home", href: "/home", tabs: undefined },
      { key: "coordinations", href: "/coordinations", tabs: undefined },
      { key: "office", href: "/members", tabs: ["members"] },
    ]);
  });
});

describe("이용 상태별 탭", () => {
  const cases: Array<[AccessCondition, OfficeRole, string[]]> = [
    [
      "PAYMENT_OVERDUE",
      "OWNER",
      ["settlements", "members", "office-info", "verification", "billing"],
    ],
    ["PAYMENT_OVERDUE", "AGENT", ["settlements", "members"]],
    ["PAYMENT_OVERDUE", "DEPUTY", ["members"]],
    ["VERIFIED_UNPAID", "OWNER", ["verification", "billing"]],
    ["VERIFIED_UNPAID", "AGENT", []],
    ["VERIFIED_UNPAID", "DEPUTY", []],
    ["AUTH_REVOKED", "OWNER", ["verification", "billing"]],
  ];
  it.each(cases)("%s 상태의 %s에게 사무소 관리 탭은 %j", (condition, role, expected) => {
    const office = menuFor(role, condition).find((item) => item.key === "office");
    expect(office?.tabs?.map((tab) => tab.key)).toEqual(expected);
  });

  it("결제 전 대표의 사무소 관리는 열 수 있는 첫 탭으로 연다", () => {
    const office = menuFor("OWNER", "VERIFIED_UNPAID").find((item) => item.key === "office");
    expect(office?.href).toBe("/billing/auth-suspension");
  });

  it("열 수 있는 탭이 없어도 역할에 맞는 부모 메뉴는 남긴다", () => {
    const keys = menuFor("AGENT", "VERIFIED_UNPAID").map((item) => item.key);
    expect(keys).toContain("office");
    expect(keys).toContain("data");
    expect(menuFor("DEPUTY", "VERIFIED_UNPAID").map((item) => item.key)).not.toContain("data");
  });
});

describe("메뉴 표시와 접근 정책", () => {
  const roles: OfficeRole[] = ["OWNER", "AGENT", "DEPUTY"];

  it("역할에 보이는 모든 탭은 활성 상태에서 접근 정책이 연다", () => {
    for (const role of roles) {
      for (const item of menuFor(role)) {
        for (const tab of item.tabs ?? []) {
          expect(decideAccess(context("ACTIVE", role), tab.href).kind).toBe("allow");
        }
      }
    }
  });

  it("탭을 숨겨도 주소 접근은 접근 정책이 계속 막는다", () => {
    const hidden: Array<[OfficeRole, string]> = [
      ["DEPUTY", "/settlements"],
      ["DEPUTY", "/exports"],
      ["DEPUTY", "/import"],
      ["AGENT", "/import"],
      ["AGENT", "/office"],
      ["AGENT", "/billing"],
      ["DEPUTY", "/billing/auth-suspension"],
    ];
    for (const [role, path] of hidden) {
      expect(decideAccess(context("ACTIVE", role), path).kind).toBe("forbidden");
    }
  });

  it("결제 대기 대표의 결제 화면 접근 규칙은 그대로다", () => {
    for (const path of ["/billing", "/billing/card", "/billing/consent", "/billing/return-guide"]) {
      expect(decideAccess(context("VERIFIED_UNPAID", "OWNER"), path)).toEqual({
        kind: "allow",
        isReadOnly: false,
      });
    }
  });
});

describe("선택된 메뉴 판정", () => {
  const cases: Array<[string, string, string | null]> = [
    ["/home", "home", null],
    ["/tasks", "home", null],
    ["/notifications", "home", null],
    ["/properties/12/edit", "properties", null],
    ["/customers/3", "customers", null],
    ["/coordinations/5/requests", "coordinations", null],
    ["/granted-properties", "coordinations", null],
    ["/contracts/7/fees", "contracts", null],
    ["/import", "data", "import"],
    ["/import/301", "data", "import"],
    ["/import/support/9/payment-result", "data", "import"],
    ["/exports", "data", "exports"],
    ["/settlements", "office", "settlements"],
    ["/settlements/2026-10/details", "office", "settlements"],
    ["/members", "office", "members"],
    ["/members/requests", "office", "members"],
    ["/members/owner-transfer", "office", "members"],
    ["/members/4", "office", "members"],
    ["/office", "office", "office-info"],
    ["/office/close", "office", "office-info"],
    ["/office/verification", "office", "verification"],
    ["/billing/auth-suspension", "office", "verification"],
    ["/billing", "office", "billing"],
    ["/billing/plans", "office", "billing"],
    ["/billing/card", "office", "billing"],
    ["/billing/card/result", "office", "billing"],
    ["/billing/consent", "office", "billing"],
    ["/billing/return-guide", "office", "billing"],
    ["/billing/invoices/3", "office", "billing"],
    ["/billing/refunds/2", "office", "billing"],
    ["/billing/tax-recipient", "office", "billing"],
  ];
  it.each(cases)("%s 은 %s 메뉴의 %s 탭이다", (path, sectionKey, tabKey) => {
    expect(resolveActiveMenu(path)).toEqual({ sectionKey, tabKey });
  });

  it("접두어가 같은 낱말의 일부일 뿐인 주소는 선택하지 않는다", () => {
    expect(resolveActiveMenu("/billingx")).toBeNull();
    expect(resolveActiveMenu("/officers")).toBeNull();
  });

  it("주소로 못 찾으면 화면이 넘긴 기존 키로 찾는다", () => {
    expect(resolveActiveMenu("/unknown", "billing")).toEqual({
      sectionKey: "office",
      tabKey: "billing",
    });
    expect(resolveActiveMenu("/unknown", "office")).toEqual({ sectionKey: "office", tabKey: null });
    expect(resolveActiveMenu("/unknown", "nothing")).toBeNull();
  });
});

describe("메뉴 설정", () => {
  it("메뉴 키와 탭 키는 서로 겹치지 않는다", () => {
    const keys = OFFICE_MENU_CONFIG.flatMap((section) => [
      section.key,
      ...(section.tabs ?? []).map((tab) => tab.key),
    ]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
