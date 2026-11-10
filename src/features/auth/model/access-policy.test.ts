import { describe, expect, it } from "vitest";
import type { AuthContextResponse } from "@/lib/api/contracts/common.schema";
import { describeAccess, describeGrace } from "./access-notice";
import type { AccessCondition, OfficeRole } from "./access-policy";
import { decideAccess, decideOpsAccess, loginRedirect, routeAreaOf } from "./access-policy";
import { getOfficeMenu } from "./role-menu";

function context(
  accessCondition: AccessCondition,
  overrides: Partial<AuthContextResponse> = {},
): AuthContextResponse {
  return {
    accessCondition,
    officeId: 1,
    role: "OWNER",
    pendingRegistrationId: null,
    pendingMembershipId: null,
    unresolvedRejection: null,
    graceUntil: null,
    returnPeriodEndsAt: null,
    restrictionReason: null,
    removalReason: null,
    reconsentRequired: false,
    ...overrides,
  };
}

const NOTICE = { kind: "redirect", to: "/access" } as const;

describe("화면 영역 분류", () => {
  it("계정·지원·개인정보는 계정 영역이다", () => {
    expect(routeAreaOf("/account")).toBe("account");
    expect(routeAreaOf("/account/withdrawal")).toBe("account");
    expect(routeAreaOf("/support")).toBe("account");
    expect(routeAreaOf("/privacy-requests")).toBe("account");
  });

  it("인증 신청과 결제는 각자의 영역이고 나머지는 업무 영역이다", () => {
    expect(routeAreaOf("/office/verification")).toBe("verification");
    expect(routeAreaOf("/billing/invoices")).toBe("billing");
    expect(routeAreaOf("/properties")).toBe("business");
    expect(routeAreaOf("/")).toBe("business");
    expect(routeAreaOf("/accounting")).toBe("business");
  });
});

describe("미로그인", () => {
  it("로그인 화면으로 보내고 원래 주소를 넘긴다", () => {
    expect(decideAccess(null, "/properties")).toEqual({
      kind: "redirect",
      to: "/login?next=%2Fproperties",
    });
    expect(decideAccess(null, "/")).toEqual({ kind: "redirect", to: "/login" });
  });

  it("바깥 주소로 이어지는 next는 붙이지 않는다", () => {
    expect(loginRedirect("//evil.example")).toEqual({ kind: "redirect", to: "/login" });
  });
});

describe("접근 상태별 허용 범위", () => {
  it("활성 상태에서 대표와 공인중개사는 업무 화면을 연다", () => {
    expect(decideAccess(context("ACTIVE"), "/properties")).toEqual({
      kind: "allow",
      isReadOnly: false,
    });
    expect(decideAccess(context("ACTIVE", { role: "AGENT" }), "/contracts")).toEqual({
      kind: "allow",
      isReadOnly: false,
    });
  });

  it("미납 유예 중인 활성 상태는 그대로 연다", () => {
    expect(
      decideAccess(context("ACTIVE", { graceUntil: "2026-12-01T00:00:00+09:00" }), "/"),
    ).toEqual({ kind: "allow", isReadOnly: false });
  });

  it("미납이 길어지면 업무 화면은 읽기 전용으로 연다", () => {
    expect(decideAccess(context("PAYMENT_OVERDUE"), "/properties")).toEqual({
      kind: "allow",
      isReadOnly: true,
    });
  });

  it.each<AccessCondition>([
    "PRE_VERIFICATION",
    "OFFICE_UNDER_REVIEW",
    "VERIFIED_UNPAID",
    "AUTH_REVOKED",
    "REMOVED",
    "RETURN_EXPIRED",
  ])("%s 상태에서는 업무 화면 대신 안내 화면으로 보낸다", (condition) => {
    expect(decideAccess(context(condition), "/properties")).toEqual(NOTICE);
  });

  it("사무소 인증 신청 화면은 작성 중과 심사 중에만 열린다", () => {
    const path = "/office/verification";
    expect(decideAccess(context("PRE_VERIFICATION", { role: null }), path).kind).toBe("allow");
    expect(decideAccess(context("OFFICE_UNDER_REVIEW"), path).kind).toBe("allow");
    expect(decideAccess(context("ACTIVE"), path)).toEqual(NOTICE);
    expect(decideAccess(context("VERIFIED_UNPAID"), path)).toEqual(NOTICE);
  });

  it("인증 회수 상태에서는 대표에게만 인증 소명 화면을 연다", () => {
    const path = "/office/verification";
    expect(decideAccess(context("AUTH_REVOKED", { role: "OWNER" }), path).kind).toBe("allow");
    expect(decideAccess(context("AUTH_REVOKED", { role: "AGENT" }), path)).toEqual(NOTICE);
  });

  it("결제 화면은 대표만 열 수 있다", () => {
    expect(decideAccess(context("VERIFIED_UNPAID"), "/billing").kind).toBe("allow");
    expect(decideAccess(context("PAYMENT_OVERDUE"), "/billing").kind).toBe("allow");
    expect(decideAccess(context("AUTH_REVOKED"), "/billing").kind).toBe("allow");
    expect(decideAccess(context("VERIFIED_UNPAID", { role: "AGENT" }), "/billing")).toEqual({
      kind: "forbidden",
    });
  });

  it("인증 전이나 반환 기간이 끝난 뒤에는 결제 화면도 닫힌다", () => {
    expect(decideAccess(context("PRE_VERIFICATION", { role: null }), "/billing")).toEqual(NOTICE);
    expect(decideAccess(context("RETURN_EXPIRED"), "/billing")).toEqual(NOTICE);
    expect(decideAccess(context("REMOVED"), "/billing")).toEqual(NOTICE);
  });

  it("계정·지원·개인정보 화면은 어떤 접근 상태에서도 열린다", () => {
    const conditions: AccessCondition[] = [
      "PRE_VERIFICATION",
      "OFFICE_UNDER_REVIEW",
      "VERIFIED_UNPAID",
      "ACTIVE",
      "PAYMENT_OVERDUE",
      "AUTH_REVOKED",
      "REMOVED",
      "RETURN_EXPIRED",
    ];
    for (const condition of conditions) {
      expect(decideAccess(context(condition), "/account")).toEqual({
        kind: "allow",
        isReadOnly: false,
      });
      expect(decideAccess(context(condition), "/support").kind).toBe("allow");
    }
  });
});

describe("역할별 화면 접근", () => {
  const cases: Array<[OfficeRole, string, "allow" | "forbidden"]> = [
    ["OWNER", "/office", "allow"],
    ["AGENT", "/office", "forbidden"],
    ["DEPUTY", "/office", "forbidden"],
    ["AGENT", "/customers", "allow"],
    ["DEPUTY", "/customers", "forbidden"],
    ["DEPUTY", "/properties", "forbidden"],
    ["DEPUTY", "/contracts", "forbidden"],
    ["DEPUTY", "/settlements", "forbidden"],
    ["DEPUTY", "/coordinations", "allow"],
    ["DEPUTY", "/", "allow"],
  ];
  it.each(cases)("%s의 %s 접근은 %s", (role, path, expected) => {
    expect(decideAccess(context("ACTIVE", { role }), path).kind).toBe(expected);
  });
});

describe("약관 재동의", () => {
  it("재동의가 필요하면 업무·인증 신청·결제 화면은 재동의 화면으로 보낸다", () => {
    const needsConsent = context("ACTIVE", { reconsentRequired: true });
    const expected = { kind: "redirect", to: "/reconsent" };
    expect(decideAccess(needsConsent, "/properties")).toEqual(expected);
    expect(decideAccess(needsConsent, "/billing")).toEqual(expected);
    expect(
      decideAccess(
        context("OFFICE_UNDER_REVIEW", { reconsentRequired: true }),
        "/office/verification",
      ),
    ).toEqual(expected);
  });

  it("재동의 중에도 계정·지원 화면은 열린다", () => {
    const needsConsent = context("ACTIVE", { reconsentRequired: true });
    expect(decideAccess(needsConsent, "/account").kind).toBe("allow");
    expect(decideAccess(needsConsent, "/support").kind).toBe("allow");
  });
});

describe("운영 콘솔", () => {
  it("운영자로 확인되면 열고 아니면 운영자 로그인으로 보낸다", () => {
    expect(decideOpsAccess(true).kind).toBe("allow");
    expect(decideOpsAccess(false)).toEqual({ kind: "redirect", to: "/ops/login" });
  });
});

describe("역할별 메뉴", () => {
  const keys = (role: OfficeRole) => getOfficeMenu(role).map((item) => item.key);

  it("대표는 여섯 개 메뉴에 사무소 관리와 결제를 더 본다", () => {
    expect(keys("OWNER")).toEqual([
      "home",
      "properties",
      "customers",
      "coordinations",
      "contracts",
      "settlements",
      "office",
      "billing",
    ]);
  });

  it("소속공인중개사는 여섯 개 메뉴만 본다", () => {
    expect(keys("AGENT")).toEqual([
      "home",
      "properties",
      "customers",
      "coordinations",
      "contracts",
      "settlements",
    ]);
  });

  it("중개보조원은 홈과 방문 조율만 본다", () => {
    expect(keys("DEPUTY")).toEqual(["home", "coordinations"]);
  });
});

describe("접근 안내 문구", () => {
  it("활성 상태에는 안내가 없다", () => {
    expect(describeAccess(context("ACTIVE"))).toBeNull();
  });

  it("참여 대기와 인증 신청 작성 중을 구분한다", () => {
    const waiting = describeAccess(context("PRE_VERIFICATION", { pendingMembershipId: 3 }));
    const drafting = describeAccess(context("PRE_VERIFICATION", { pendingRegistrationId: 4 }));
    expect(waiting?.title).toBe("사무소 참여 승인을 기다리고 있습니다");
    expect(drafting?.title).toBe("사무소 인증이 필요합니다");
  });

  it("인증 회수와 재인증 중단, 퇴사·내보냄·접근 정지를 다른 문구로 안내한다", () => {
    const revoked = describeAccess(context("AUTH_REVOKED", { restrictionReason: "REVOKED" }));
    const suspended = describeAccess(
      context("AUTH_REVOKED", { restrictionReason: "REVERIFICATION_SUSPENDED" }),
    );
    expect(revoked?.title).not.toBe(suspended?.title);
    const titles = (["RESIGNED", "REMOVED", "SUSPENDED"] as const).map(
      (reason) => describeAccess(context("REMOVED", { removalReason: reason }))?.title,
    );
    expect(new Set(titles).size).toBe(3);
  });

  it("인증 회수 중 대표에게만 소명과 결제 동작을 준다", () => {
    const owner = describeAccess(context("AUTH_REVOKED", { role: "OWNER" }));
    const agent = describeAccess(context("AUTH_REVOKED", { role: "AGENT" }));
    expect(owner?.actions.map((action) => action.href)).toContain("/office/verification");
    expect(agent?.actions.map((action) => action.href)).not.toContain("/office/verification");
  });

  it("결제 전에는 대표에게 결제 동작을 직원에게 대기 안내를 준다", () => {
    const owner = describeAccess(context("VERIFIED_UNPAID", { role: "OWNER" }));
    const agent = describeAccess(context("VERIFIED_UNPAID", { role: "AGENT" }));
    expect(owner?.actions.map((action) => action.href)).toContain("/billing");
    expect(agent?.actions.map((action) => action.href)).not.toContain("/billing");
    expect(agent?.description).toContain("대표가 결제");
  });

  it("미납 읽기 전용에서는 반환 기간 종료일을 보여준다", () => {
    const notice = describeAccess(
      context("PAYMENT_OVERDUE", { returnPeriodEndsAt: "2026-12-31T00:00:00+09:00" }),
    );
    expect(notice?.details[0]).toContain("2026");
  });

  it("거절 사유가 있으면 함께 보여준다", () => {
    const notice = describeAccess(
      context("PRE_VERIFICATION", {
        unresolvedRejection: { type: "MEMBERSHIP", reason: "서류 불일치" },
      }),
    );
    expect(notice?.details).toEqual(["거절 사유: 서류 불일치"]);
  });

  it("유예 종료 시각이 있는 활성 상태에만 유예 안내를 준다", () => {
    expect(describeGrace(context("ACTIVE"))).toBeNull();
    expect(describeGrace(context("ACTIVE", { graceUntil: "2026-12-01T00:00:00+09:00" }))).toContain(
      "결제",
    );
  });
});
