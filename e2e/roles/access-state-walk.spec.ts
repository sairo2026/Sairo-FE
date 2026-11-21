import { expect, test } from "@playwright/test";
import {
  settle,
  useMockOfficeRole as setMockRole,
  useMockOpsRoles,
  type MockOfficeRole,
} from "../support/app";
import { OFFICE_ROUTES } from "../support/office-routes";
import { fixMockClock } from "../support/scenario";
import { attachProbe, collectFacts, unexpectedFailures } from "../support/walk";
import { OPS_MENU } from "../../src/features/ops/model/menu";
import { hasAnyRole, type OpsRole } from "../../src/features/ops/model/roles";
import { listAppRoutes } from "../support/routes";

const NOTICE_PATH = "/access";
const FORBIDDEN_TITLE = "접근 권한이 없습니다";
const OPS_FORBIDDEN_TITLE = "이 화면을 볼 수 있는 운영 역할이 아닙니다";
/** 저장을 일으키는 버튼의 이름. 필터, 건수 칩, 내비게이션 링크가 걸리지 않게 끝말로 판정한다. */
const WRITE_ACTION = /(등록|저장|삭제|생성|발송|제출|확정)(하기)?$/;

// 실패 원인을 한 번에 보려고 재시도 없이 돈다.
test.describe.configure({ retries: 0 });

test.beforeEach(async ({ page }) => {
  await fixMockClock(page);
});

type NoticeState = {
  role: MockOfficeRole;
  title: string;
  /** 안내 화면에 있어야 하는 이동 링크. */
  links: string[];
  /** 안내 없이 바로 열려야 하는 경로와 최종 주소. */
  open: ReadonlyArray<readonly [string, string]>;
  /** 안내 대신 권한 없음이 떠야 하는 경로. */
  forbidden?: readonly string[];
};

const ACCOUNT_OPEN = [
  ["/account", "/account"],
  ["/settings", "/account"],
] as const;

const NOTICE_STATES: readonly NoticeState[] = [
  {
    role: "OWNER_UNPAID",
    title: "결제를 기다리고 있습니다",
    links: ["구독·결제", "내 계정", "지원 문의"],
    open: [...ACCOUNT_OPEN, ["/billing", "/billing"], ["/billing/plans", "/billing/plans"]],
  },
  {
    role: "AGENT_UNPAID",
    title: "대표의 결제를 기다리고 있습니다",
    links: ["내 계정", "지원 문의"],
    open: ACCOUNT_OPEN,
  },
  {
    role: "OWNER_REVIEW",
    title: "사무소 인증을 심사하고 있습니다",
    links: ["심사 상태 확인", "내 계정", "지원 문의"],
    open: ACCOUNT_OPEN,
  },
  {
    role: "AGENT_REVIEW",
    title: "사무소 인증을 심사하고 있습니다",
    links: ["내 계정", "지원 문의"],
    open: ACCOUNT_OPEN,
  },
  {
    role: "OWNER_REVOKED",
    title: "사무소 인증이 회수되어 접근이 제한되었습니다",
    links: ["인증 소명", "구독·결제", "내 계정", "지원 문의"],
    open: [
      ...ACCOUNT_OPEN,
      ["/billing", "/billing"],
      ["/billing/plans", "/billing/plans"],
      ["/office/verification", "/office/verification"],
    ],
  },
  {
    role: "OWNER_SUSPENDED",
    title: "재인증이 중단되어 접근이 제한되었습니다",
    links: ["인증 소명", "구독·결제", "내 계정", "지원 문의"],
    open: [
      ...ACCOUNT_OPEN,
      ["/billing", "/billing"],
      ["/billing/plans", "/billing/plans"],
      ["/office/verification", "/office/verification"],
    ],
  },
  {
    role: "AGENT_REVOKED",
    title: "사무소 인증이 회수되어 접근이 제한되었습니다",
    links: ["내 계정", "지원 문의"],
    open: ACCOUNT_OPEN,
    forbidden: ["/billing", "/billing/plans"],
  },
  {
    role: "REMOVED",
    title: "사무소에서 내보내졌습니다",
    links: ["내 계정", "지원 문의"],
    open: ACCOUNT_OPEN,
  },
  {
    role: "RETURN_EXPIRED",
    title: "데이터 반환 기간이 끝났습니다",
    links: ["내 계정", "지원 문의"],
    open: ACCOUNT_OPEN,
  },
];

/** 접근 제한 상태에서 업무 화면은 모두 같은 안내로 이동하므로 영역별 대표 화면만 돈다. */
const SAMPLE_PATHS = [
  "/home",
  "/properties/new",
  "/customers/1",
  "/import",
  "/members",
  "/notifications",
];
const WALK_PATHS = OFFICE_ROUTES.map((route) => route.path).filter((path) =>
  SAMPLE_PATHS.includes(path),
);

for (const state of NOTICE_STATES) {
  test.describe(`${state.role} 접근 제한 화면 순회`, () => {
    const openPaths = new Map(state.open);
    const forbidden = new Set(state.forbidden ?? []);
    const paths = [...new Set([...WALK_PATHS, ...openPaths.keys(), ...forbidden])];

    for (const path of paths) {
      test(`${path}`, async ({ page }) => {
        await setMockRole(page, state.role);
        const probe = attachProbe(page);
        await page.goto(path);
        await settle(page);
        await expect(page.getByRole("heading").first(), "화면 제목").toBeVisible();
        const facts = await collectFacts(page);
        const finalPath = new URL(page.url()).pathname;

        expect.soft(facts.overflow, "가로 넘침").toBeLessThanOrEqual(1);
        expect.soft(probe.pageErrors, "페이지 오류").toEqual([]);
        expect.soft(probe.consoleErrors, "콘솔 오류").toEqual([]);

        const opened = openPaths.get(path);
        if (opened !== undefined) {
          expect.soft(finalPath, "열려야 하는 화면이 다른 곳으로 이동함").toBe(opened);
          expect.soft(facts.forbidden, "열려야 하는 화면이 권한 없음").toBe(false);
          expect
            .soft(
              probe.failedApis.filter((l) => /^5/.test(l)),
              "5xx",
            )
            .toEqual([]);
          return;
        }
        if (forbidden.has(path)) {
          expect.soft(facts.forbidden, "권한 없음 안내가 없음").toBe(true);
          expect.soft(facts.actions, "금지된 화면에 동작 버튼이 남음").toEqual([]);
          return;
        }
        // 업무 화면은 안내 화면으로 보내고 업무 자료를 부르지 않는다.
        expect.soft(finalPath, "업무 화면이 안내 없이 열림").toBe(NOTICE_PATH);
        expect.soft(facts.headings.join("|"), "안내 제목").toContain(state.title);
        expect.soft(facts.actions, "안내 화면에 저장 동작이 남음").toEqual([]);
        const links = await page
          .locator("main a[href]")
          .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
        expect.soft(links, "안내 화면의 이동 링크").toEqual(state.links);
        await expect.soft(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
        expect
          .soft(
            probe.failedApis.filter((line) => !line.startsWith("401 GET /api/auth/context")),
            "안내 화면의 API 실패",
          )
          .toEqual([]);
      });
    }
  });
}

/** 읽기 전용(미납 지연)에서 역할별로 열리는 화면, 배너, 저장 동작을 점검한다. */
for (const role of ["AGENT_OVERDUE", "DEPUTY_OVERDUE"] as const) {
  const officeRole = role === "AGENT_OVERDUE" ? "AGENT" : "DEPUTY";
  test.describe(`${role} 읽기 전용 화면 순회`, () => {
    for (const route of OFFICE_ROUTES) {
      test(`${route.path} (${route.label})`, async ({ page }) => {
        await setMockRole(page, role);
        const probe = attachProbe(page);
        await page.goto(route.path);
        await settle(page);
        const facts = await collectFacts(page);
        const finalPath = new URL(page.url()).pathname;

        expect.soft(facts.overflow, "가로 넘침").toBeLessThanOrEqual(1);
        expect.soft(facts.headings.length, "제목 없음").toBeGreaterThan(0);
        expect.soft(probe.pageErrors, "페이지 오류").toEqual([]);
        expect.soft(probe.consoleErrors, "콘솔 오류").toEqual([]);

        // 결제는 대표만 하므로 직원은 홈으로 돌아온다.
        if (route.path.startsWith("/billing")) {
          expect.soft(finalPath, "직원이 결제 화면에서 홈으로 돌아오지 않음").toBe("/home");
          return;
        }
        const isAccountArea = route.path === "/account" || route.path === "/settings";
        if (!route.roles.includes(officeRole)) {
          expect.soft(facts.forbidden, "금지된 화면에 권한 안내가 없음").toBe(true);
          expect.soft(facts.actions, "금지된 화면에 동작 버튼이 남음").toEqual([]);
          return;
        }
        expect.soft(facts.forbidden, "허용된 화면이 권한 없음").toBe(false);
        expect.soft(unexpectedFailures(probe), "실패한 API 호출").toEqual([]);
        if (isAccountArea) return;
        expect.soft(facts.banner, "읽기 전용 안내 문구").not.toBeNull();
        expect
          .soft(
            facts.actions.filter((text) => WRITE_ACTION.test(text)),
            "읽기 전용인데 활성 상태인 저장 동작",
          )
          .toEqual([]);
      });
    }
  });
}

test.describe("읽기 전용 상태의 대표 결제 화면", () => {
  for (const path of ["/billing", "/billing/plans"]) {
    test(`OWNER_OVERDUE ${path}는 열리고 결제 안내가 있다`, async ({ page }) => {
      await setMockRole(page, "OWNER_OVERDUE");
      const probe = attachProbe(page);
      await page.goto(path);
      await settle(page);
      const facts = await collectFacts(page);
      expect.soft(new URL(page.url()).pathname).toBe(path);
      expect.soft(facts.forbidden).toBe(false);
      expect.soft(facts.headings.length).toBeGreaterThan(0);
      expect.soft(facts.banner, "읽기 전용 안내 문구").not.toBeNull();
      expect.soft(probe.pageErrors).toEqual([]);
      expect.soft(unexpectedFailures(probe)).toEqual([]);
    });
  }
});

/** 메뉴에 없는 하위 화면의 필요 역할. 화면 코드의 역할 지정과 같아야 한다. */
const OPS_EXTRA_PATHS: ReadonlyArray<{ href: string; roles: readonly OpsRole[] }> = [
  { href: "/ops/audit-log", roles: ["SECURITY_ADMIN"] },
  { href: "/ops/raw-access/new", roles: [] },
  { href: "/ops/billing/refunds", roles: ["BILLING"] },
];
const knownOpsPaths = new Set(listAppRoutes().map((route) => route.path));
const OPS_WALK: ReadonlyArray<{ href: string; roles: readonly OpsRole[] }> = [
  ...OPS_MENU.map((item) => ({ href: item.href, roles: item.roles })),
  ...OPS_EXTRA_PATHS.filter((extra) => knownOpsPaths.has(extra.href)),
];

/** 업무 역할 전부를 돌면 시간이 길어져, 화면 묶음이 서로 겹치지 않는 대표 역할만 돈다. */
/** 운영자 하위 역할마다 메뉴와 각 화면의 허용·차단이 역할 규칙과 같은지 본다. */
const WALKED_OPS_ROLES: readonly OpsRole[] = ["BILLING", "PRIVACY", "OPS", "EXEC_VIEW"];
for (const role of WALKED_OPS_ROLES) {
  test.describe(`운영 역할 ${role} 화면 순회`, () => {
    test("메뉴는 보유 역할에 맞는 항목만 나온다", async ({ page }) => {
      await useMockOpsRoles(page, [role]);
      await page.goto("/ops");
      await settle(page);
      const labels = await page
        .getByRole("navigation")
        .first()
        .getByRole("link")
        .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
      const expected = OPS_MENU.filter((item) => hasAnyRole([role], item.roles)).map(
        (item) => item.label,
      );
      expect.soft(labels, "운영 메뉴").toEqual(expected);
    });

    for (const target of OPS_WALK) {
      test(`${target.href}`, async ({ page }) => {
        const allowed = hasAnyRole([role], target.roles);
        await useMockOpsRoles(page, [role]);
        const probe = attachProbe(page);
        await page.goto(target.href);
        await settle(page);
        const facts = await collectFacts(page);

        expect.soft(facts.overflow, "가로 넘침").toBeLessThanOrEqual(1);
        expect.soft(facts.headings.length, "제목 없음").toBeGreaterThan(0);
        expect.soft(probe.pageErrors, "페이지 오류").toEqual([]);
        expect.soft(probe.consoleErrors, "콘솔 오류").toEqual([]);
        if (allowed) {
          expect.soft(facts.headings.join("|")).not.toContain(OPS_FORBIDDEN_TITLE);
          expect.soft(unexpectedFailures(probe), "실패한 API 호출").toEqual([]);
        } else {
          expect
            .soft(facts.headings.join("|"), "역할 없음 안내가 없음")
            .toContain(OPS_FORBIDDEN_TITLE);
          expect.soft(facts.actions, "역할 없는 화면에 동작 버튼이 남음").toEqual([]);
          expect.soft(probe.failedApis, "역할 없는 화면의 업무 API 호출").toEqual([]);
        }
      });
    }
  });
}

test.describe("권한 없음 화면의 문구", () => {
  test("직원의 대표 전용 화면에 안내 제목이 있다", async ({ page }) => {
    await setMockRole(page, "AGENT_REVOKED");
    await page.goto("/billing");
    await settle(page);
    await expect(page.getByRole("heading", { name: FORBIDDEN_TITLE })).toBeVisible();
  });
});
