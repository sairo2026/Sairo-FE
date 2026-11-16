import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { settle, useMockOfficeRole as setMockRole, type MockOfficeRole } from "../support/app";
import { fixMockClock } from "../support/scenario";
import { listAppRoutes } from "../support/routes";

type Role = "OWNER" | "AGENT" | "DEPUTY";
const ROLES: readonly Role[] = ["OWNER", "AGENT", "DEPUTY"];
const FORBIDDEN_TITLE = "접근 권한이 없습니다";
const REPORT_DIR = join(process.cwd(), "role-walk-report");

/** 접근 규칙(access-policy, role-menu)에서 기대하는 역할별 접근 표. */
const OFFICE_ROUTES: ReadonlyArray<{
  path: string;
  label: string;
  roles: readonly Role[];
  finalPath?: string;
}> = [
  { path: "/home", label: "홈", roles: ROLES },
  { path: "/tasks", label: "오늘 할 일", roles: ROLES },
  { path: "/properties", label: "매물", roles: ["OWNER", "AGENT"] },
  { path: "/properties/new", label: "매물 등록", roles: ["OWNER", "AGENT"] },
  { path: "/customers", label: "고객", roles: ["OWNER", "AGENT"] },
  { path: "/customers/new", label: "고객 등록", roles: ["OWNER", "AGENT"] },
  { path: "/coordinations", label: "방문 조율", roles: ROLES },
  { path: "/coordinations/new", label: "방문 조율 생성", roles: ROLES },
  { path: "/granted-properties", label: "열람 허용 매물", roles: ROLES },
  { path: "/contracts", label: "계약", roles: ["OWNER", "AGENT"] },
  { path: "/contracts/new", label: "계약 등록", roles: ["OWNER", "AGENT"] },
  { path: "/import", label: "데이터 이전", roles: ["OWNER"] },
  { path: "/exports", label: "데이터 내보내기", roles: ["OWNER", "AGENT"] },
  { path: "/settlements", label: "월말결산", roles: ["OWNER", "AGENT"] },
  { path: "/members", label: "구성원", roles: ROLES },
  { path: "/billing", label: "구독·결제", roles: ["OWNER"] },
  { path: "/billing/plans", label: "요금제", roles: ["OWNER"] },
  { path: "/office", label: "사무소 정보", roles: ["OWNER"] },
  { path: "/notifications", label: "알림", roles: ROLES },
  { path: "/settings", label: "계정 설정", roles: ROLES, finalPath: "/account" },
  { path: "/properties/1", label: "매물 상세", roles: ["OWNER", "AGENT"] },
  { path: "/customers/1", label: "고객 상세", roles: ["OWNER", "AGENT"] },
  { path: "/contracts/1", label: "계약 상세", roles: ["OWNER", "AGENT"] },
  { path: "/account", label: "내 계정", roles: ROLES },
];

const EXPECTED_MENU: Record<Role, string[]> = {
  OWNER: [
    "홈 (오늘 할 일)",
    "매물 관리",
    "고객 관리",
    "방문 조율",
    "계약 관리",
    "데이터 관리",
    "사무소 관리",
  ],
  AGENT: [
    "홈 (오늘 할 일)",
    "매물 관리",
    "고객 관리",
    "방문 조율",
    "계약 관리",
    "데이터 관리",
    "사무소 관리",
  ],
  DEPUTY: ["홈 (오늘 할 일)", "방문 조율", "사무소 관리"],
};

type Probe = {
  consoleErrors: string[];
  failedApis: string[];
  pageErrors: string[];
  detach: () => void;
};

function attachProbe(page: Page): Probe {
  let active = true;
  const probe: Probe = {
    consoleErrors: [],
    failedApis: [],
    pageErrors: [],
    detach: () => {
      active = false;
    },
  };
  page.on("console", (message) => {
    if (!active || message.type() !== "error") return;
    const text = message.text();
    // 응답 상태는 failedApis가 따로 잡는다.
    if (text.startsWith("Failed to load resource")) return;
    probe.consoleErrors.push(text.slice(0, 300));
  });
  page.on("pageerror", (error) => {
    if (active) probe.pageErrors.push(String(error).slice(0, 300));
  });
  page.on("response", (response) => {
    if (!active) return;
    const url = new URL(response.url());
    if (!url.pathname.startsWith("/api/")) return;
    if (response.status() >= 400) {
      probe.failedApis.push(
        `${response.status()} ${response.request().method()} ${url.pathname}${url.search}`,
      );
    }
  });
  page.on("requestfailed", (request) => {
    if (!active) return;
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) {
      probe.failedApis.push(`FAILED ${request.method()} ${url.pathname}`);
    }
  });
  return probe;
}

/** 모의 자료에 없는 번호(1)나 비어 있는 상태를 뜻하는 404·401은 정상 응답으로 본다. */
const EXPECTED_EMPTY =
  /^(404|401) GET .*(\/1(\/|\?|$)|archive-grants\/current|owner-transfer|start-customer-agreement)/;

function unexpectedFailures(probe: Probe): string[] {
  return probe.failedApis.filter((line) => !EXPECTED_EMPTY.test(line));
}

type PageFacts = {
  overflow: number;
  headings: string[];
  forbidden: boolean;
  menu: string[];
  actions: string[];
  disabledActions: string[];
  banner: string | null;
  url: string;
};

const MUTATING = /등록|저장|삭제|보관|추가|생성|신청|제출|발송|확정|취소|이전|내보내기/;

async function collectFacts(page: Page): Promise<PageFacts> {
  return page.evaluate((mutatingSource) => {
    const mutating = new RegExp(mutatingSource);
    const root = document.documentElement;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const textOf = (el: Element) => (el.textContent ?? "").trim().replace(/\s+/g, " ");
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, [role='heading']"))
      .filter(visible)
      .map(textOf);
    const nav = document.querySelector('nav[aria-label="주요 메뉴"]');
    const menu = nav ? Array.from(nav.querySelectorAll("a")).map(textOf) : [];
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main button, main a[href], [role='main'] button, [role='main'] a[href]",
      ),
    ).filter(visible);
    const named = controls
      .map((el) => ({
        text: el.getAttribute("aria-label") ?? textOf(el),
        disabled:
          (el as HTMLButtonElement).disabled === true ||
          el.getAttribute("aria-disabled") === "true",
      }))
      .filter((item) => mutating.test(item.text));
    const status = Array.from(document.querySelectorAll("[role='status']"))
      .map(textOf)
      .find((text) => text.includes("읽기만"));
    return {
      overflow: root.scrollWidth - root.clientWidth,
      headings,
      forbidden: headings.some((text) => text.includes("접근 권한이 없습니다")),
      menu,
      actions: named.filter((item) => !item.disabled).map((item) => item.text),
      disabledActions: named.filter((item) => item.disabled).map((item) => item.text),
      banner: status ?? null,
      url: location.pathname,
    };
  }, MUTATING.source);
}

const matrix: Record<string, unknown> = {};

function record(key: string, value: unknown) {
  matrix[key] = value;
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, `${key.replace(/[^\w가-힣-]+/g, "_")}.json`),
    JSON.stringify(value, null, 2),
  );
}

test.beforeEach(async ({ page }) => {
  await fixMockClock(page);
});

for (const role of ROLES) {
  test.describe(`${role} 사무소 화면 순회`, () => {
    test(`${role} 왼쪽 메뉴는 역할 규칙과 같다`, async ({ page }) => {
      await setMockRole(page, role);
      await page.goto("/home");
      await settle(page);
      const facts = await collectFacts(page);
      record(`menu-${role}`, facts.menu);
      expect.soft(facts.menu, `${role} 메뉴`).toEqual(EXPECTED_MENU[role]);
    });

    for (const route of OFFICE_ROUTES) {
      test(`${role} ${route.path} (${route.label})`, async ({ page }) => {
        const allowed = route.roles.includes(role);
        await setMockRole(page, role);
        const probe = attachProbe(page);
        await page.goto(route.path);
        await settle(page);
        const facts = await collectFacts(page);
        record(`route-${role}-${route.path}`, { allowed, ...facts });

        expect.soft(facts.overflow, "가로 넘침").toBeLessThanOrEqual(1);
        expect.soft(facts.headings.length, "제목 없음").toBeGreaterThan(0);
        if (allowed) {
          expect.soft(facts.forbidden, "허용된 화면이 권한 없음으로 열림").toBe(false);
          expect
            .soft(new URL(page.url()).pathname, "예상 밖 이동")
            .toBe(route.finalPath ?? route.path);
          expect.soft(unexpectedFailures(probe), "실패한 API 호출").toEqual([]);
        } else {
          expect.soft(facts.forbidden, "금지된 화면에 권한 안내가 없음").toBe(true);
          expect.soft(facts.actions, "금지된 화면에 동작 버튼이 남음").toEqual([]);
          // 금지 화면은 업무 API를 부르지 않아야 한다.
          expect.soft(probe.failedApis, "금지 화면의 API 호출").toEqual([]);
        }
        expect.soft(probe.pageErrors, "페이지 오류").toEqual([]);
        expect.soft(probe.consoleErrors, "콘솔 오류").toEqual([]);
      });
    }
  });
}

test.describe("역할 간 동작 버튼 일관성", () => {
  for (const path of ["/home", "/coordinations", "/members", "/notifications"]) {
    test(`${path}에서 보조 역할의 동작은 대표의 부분집합이다`, async ({ browser }) => {
      const seen: Record<string, string[]> = {};
      for (const role of ROLES) {
        const context = await browser.newContext({ locale: "ko-KR", timezoneId: "Asia/Seoul" });
        const page = await context.newPage();
        await fixMockClock(page);
        await setMockRole(page, role);
        await page.goto(path);
        await settle(page);
        seen[role] = (await collectFacts(page)).actions;
        await context.close();
      }
      record(`actions-${path}`, seen);
      for (const role of ["AGENT", "DEPUTY"] as const) {
        const extra = (seen[role] ?? []).filter(
          (text) => !(seen.OWNER ?? []).includes(text) && text !== "대표 이전 확인",
        );
        expect.soft(extra, `${role}에게만 보이는 동작`).toEqual([]);
      }
    });
  }
});

test.describe("대표 결제 지연 읽기 전용", () => {
  // /properties는 매물 화면 담당 작업이 끝난 뒤 포함한다.
  for (const path of ["/customers", "/contracts", "/coordinations", "/members"]) {
    test(`${path}은 안내 배너를 보이고 저장 동작을 막는다`, async ({ page }) => {
      await setMockRole(page, "OWNER_OVERDUE" as MockOfficeRole);
      const probe = attachProbe(page);
      await page.goto(path);
      await settle(page);
      const facts = await collectFacts(page);
      record(`overdue-${path}`, facts);
      expect.soft(facts.banner, "읽기 전용 배너").not.toBeNull();
      expect
        .soft(
          facts.actions.filter((text) => /등록|저장|삭제|생성/.test(text)),
          "읽기 전용인데 활성 상태인 변경 버튼",
        )
        .toEqual([]);
      expect.soft(probe.pageErrors).toEqual([]);
      expect.soft(probe.consoleErrors).toEqual([]);
    });
  }
});

/** 각 만들기 흐름의 첫 단계에서 비어 있는 채로 진행 버튼을 눌러 본다. */
const CREATE_FLOWS: ReadonlyArray<{ path: string; roles: readonly Role[] }> = [
  { path: "/properties/new", roles: ["OWNER", "AGENT"] },
  { path: "/customers/new", roles: ["OWNER", "AGENT"] },
  { path: "/contracts/new", roles: ["OWNER", "AGENT"] },
  { path: "/coordinations/new", roles: ROLES },
];

type FieldAudit = {
  star: string[];
  badStarColor: string[];
  optional: string[];
  unmarked: string[];
};

async function auditFields(page: Page): Promise<FieldAudit> {
  return page.evaluate(() => {
    const audit = { star: [], badStarColor: [], optional: [], unmarked: [] } as {
      star: string[];
      badStarColor: string[];
      optional: string[];
      unmarked: string[];
    };
    const controls = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        "main input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=search]):not([type=file]), main select, main textarea",
      ),
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    for (const el of controls) {
      const label = el.labels?.[0];
      const name = (
        label?.textContent ??
        el.getAttribute("aria-label") ??
        el.getAttribute("name") ??
        ""
      )
        .trim()
        .replace(/\s+/g, " ");
      if (!name) continue;
      if (el.getAttribute("role") === "searchbox") continue;
      const starEl = label?.querySelector<HTMLElement>("[aria-hidden='true']");
      const hasStar = starEl !== null && starEl !== undefined && starEl.textContent?.includes("*");
      if (hasStar) {
        audit.star.push(name);
        const color = getComputedStyle(starEl).color;
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
        if (m && !(Number(m[1]) > Number(m[2]) + 40 && Number(m[1]) > Number(m[3]) + 40)) {
          audit.badStarColor.push(`${name} ${color}`);
        }
      } else if (name.includes("(선택)")) {
        audit.optional.push(name);
      } else if (name.includes("(필수)")) {
        audit.star.push(name);
      } else {
        audit.unmarked.push(name);
      }
    }
    return audit;
  });
}

for (const flow of CREATE_FLOWS) {
  for (const role of ROLES) {
    test(`${role} ${flow.path} 첫 단계`, async ({ page }) => {
      await setMockRole(page, role);
      const probe = attachProbe(page);
      await page.goto(flow.path);
      await settle(page);
      if (!flow.roles.includes(role)) {
        await expect(page.getByRole("heading", { name: FORBIDDEN_TITLE })).toBeVisible();
        return;
      }
      const audit = await auditFields(page);
      record(`create-${role}-${flow.path}`, audit);
      expect.soft(audit.badStarColor, "필수 별표가 빨강이 아님").toEqual([]);
      // 선택 표시 규칙은 화면마다 달라 기록만 남기고 판단은 보고서로 넘긴다.

      const primary = page
        .locator("main button:not([disabled])")
        .filter({ hasText: /다음|저장|등록|생성|신청|제출/ })
        .first();
      if ((await primary.count()) > 0) {
        await primary.click();
        await settle(page);
        expect.soft(new URL(page.url()).pathname, "빈 입력으로 진행됨").toBe(flow.path);
      }
      expect
        .soft(
          probe.failedApis.filter((l) => /^5/.test(l)),
          "5xx",
        )
        .toEqual([]);
      expect.soft(probe.pageErrors).toEqual([]);
      expect.soft(probe.consoleErrors).toEqual([]);
      const facts = await collectFacts(page);
      expect.soft(facts.overflow).toBeLessThanOrEqual(1);
    });
  }
}

test.describe("대표 전체 사무소 경로", () => {
  const officeRoutes = listAppRoutes().filter(
    (route) =>
      route.area === "office" &&
      !OFFICE_ROUTES.some((known) => known.path === route.path) &&
      // 가입·접근 상태별 안내 화면은 활성 사무소에서 다른 곳으로 이동한다.
      !/^\/(office\/(start|register|review|join|membership)|access|reconsent|removed|memberships|return|auth)/.test(
        route.path,
      ),
  );
  for (const route of officeRoutes) {
    test(`OWNER ${route.path}`, async ({ page }) => {
      await setMockRole(page, "OWNER");
      const probe = attachProbe(page);
      await page.goto(route.path);
      await settle(page);
      const facts = await collectFacts(page);
      expect.soft(facts.overflow, "가로 넘침").toBeLessThanOrEqual(1);
      expect.soft(facts.headings.length, "제목 없음").toBeGreaterThan(0);
      expect.soft(facts.forbidden, "권한 없음").toBe(false);
      expect.soft(unexpectedFailures(probe), "실패한 API 호출").toEqual([]);
      expect.soft(probe.pageErrors).toEqual([]);
      expect.soft(probe.consoleErrors).toEqual([]);
    });
  }
});

test.describe("운영 콘솔", () => {
  const opsRoutes = listAppRoutes().filter(
    (route) => route.area === "ops" && !/^\/ops\/(login|mfa|invitations)/.test(route.path),
  );
  for (const route of opsRoutes) {
    test(`운영자 ${route.path}`, async ({ page }) => {
      const probe = attachProbe(page);
      await page.goto(route.path);
      await settle(page);
      const facts = await collectFacts(page);
      expect.soft(new URL(page.url()).pathname, "예상 밖 이동").toBe(route.path);
      expect.soft(facts.overflow, "가로 넘침").toBeLessThanOrEqual(1);
      expect.soft(facts.headings.length, "제목 없음").toBeGreaterThan(0);
      expect.soft(facts.forbidden, "권한 없음").toBe(false);
      expect.soft(unexpectedFailures(probe), "실패한 API 호출").toEqual([]);
      expect.soft(probe.pageErrors).toEqual([]);
      expect.soft(probe.consoleErrors).toEqual([]);
    });
  }

  test("운영 메뉴는 모든 운영 역할에 맞춰 나오고 각 링크가 열린다", async ({ page }) => {
    await page.goto("/ops");
    await settle(page);
    const links = await page
      .getByRole("navigation")
      .first()
      .getByRole("link")
      .evaluateAll((els) =>
        els.map((el) => ({ text: (el.textContent ?? "").trim(), href: el.getAttribute("href") })),
      );
    record("ops-menu", links);
    expect(links.length).toBeGreaterThan(10);
  });
});

test.describe("공개 화면의 법적 고지와 필수·선택 표시", () => {
  const publicRoutes = listAppRoutes().filter(
    (route) =>
      route.area === "public" &&
      (route.path === "/pricing" ||
        route.path.startsWith("/legal") ||
        route.path === "/support/enterprise"),
  );
  for (const route of publicRoutes) {
    test(`${route.path} 제목, 하단 사업자 정보·법적 링크`, async ({ page }) => {
      const probe = attachProbe(page);
      await page.goto(route.path);
      await settle(page);
      const facts = await collectFacts(page);
      expect.soft(facts.headings.length, "제목 없음").toBeGreaterThan(0);
      expect.soft(facts.overflow, "가로 넘침").toBeLessThanOrEqual(1);
      const footer = page.getByRole("contentinfo");
      await expect.soft(footer, "하단 영역").toBeVisible();
      for (const name of ["이용약관", "개인정보"]) {
        await expect
          .soft(footer.getByRole("link", { name: new RegExp(name) }).first(), `하단 ${name} 링크`)
          .toBeVisible();
      }
      expect.soft(unexpectedFailures(probe), "실패한 API 호출").toEqual([]);
      expect.soft(probe.pageErrors).toEqual([]);
      expect.soft(probe.consoleErrors).toEqual([]);
    });
  }

  for (const path of ["/signup", "/signup/kakao", "/signup/email", "/support/enterprise"]) {
    test(`${path}의 동의·입력 항목은 필수 또는 선택으로 표시된다`, async ({ page }) => {
      await setMockRole(page, null);
      await page.goto(path);
      await settle(page);
      const unmarkedConsents = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLInputElement>("input[type=checkbox]"))
          .map((el) =>
            (el.labels?.[0]?.textContent ?? el.closest("li, div")?.textContent ?? "").trim(),
          )
          .filter((text) => text && !/\(필수\)|\(선택\)|전체 동의|이전 지원이 필요/.test(text))
          .map((text) => text.slice(0, 40)),
      );
      expect.soft(unmarkedConsents, "표시 없는 동의 항목").toEqual([]);
      const audit = await auditFields(page);
      expect.soft(audit.badStarColor, "필수 별표 색").toEqual([]);
      record(`public-fields-${path}`, audit);
    });
  }
});

/** 목록의 첫 항목으로 들어가 실제 모의 자료가 있는 상세·하위 화면을 연다. */
const DETAIL_WALKS: ReadonlyArray<{
  list: string;
  subs: readonly string[];
  roles: readonly Role[];
}> = [
  {
    list: "/properties",
    subs: ["", "/edit", "/cross-office", "/access-approvals"],
    roles: ["OWNER", "AGENT"],
  },
  { list: "/customers", subs: ["", "/edit"], roles: ["OWNER", "AGENT"] },
  {
    list: "/contracts",
    subs: ["", "/edit", "/fees", "/payments", "/documents", "/followups", "/renew"],
    roles: ["OWNER", "AGENT"],
  },
  { list: "/coordinations", subs: ["", "/requests"], roles: ROLES },
  { list: "/members", subs: [""], roles: ROLES },
];

async function firstDetailHref(page: Page, base: string, scope: string): Promise<string | null> {
  return page.evaluate(
    ([baseValue, scopeValue]) => {
      const re = new RegExp(`^${baseValue}/\\d+$`);
      const link = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(`${scopeValue} a[href]`),
      ).find((a) => re.test(a.getAttribute("href") ?? ""));
      return link?.getAttribute("href") ?? null;
    },
    [base, scope] as const,
  );
}

for (const walk of DETAIL_WALKS) {
  for (const role of walk.roles) {
    test(`${role} ${walk.list} 첫 항목의 상세와 하위 화면`, async ({ page }) => {
      await setMockRole(page, role);
      await page.goto(walk.list);
      await settle(page);
      const href = await firstDetailHref(page, walk.list, "main");
      expect.soft(href, "목록에서 상세 링크를 찾지 못함").not.toBeNull();
      if (href === null) return;
      for (const sub of walk.subs) {
        const where = `${href}${sub}`;
        const probe = attachProbe(page);
        await page.goto(where);
        await settle(page);
        const facts = await collectFacts(page);
        expect.soft(facts.headings.length, `${where} 제목 없음`).toBeGreaterThan(0);
        expect.soft(facts.overflow, `${where} 가로 넘침`).toBeLessThanOrEqual(1);
        expect.soft(facts.forbidden, `${where} 권한 없음`).toBe(false);
        expect.soft(unexpectedFailures(probe), `${where} 실패한 API 호출`).toEqual([]);
        expect.soft(probe.pageErrors, `${where} 페이지 오류`).toEqual([]);
        expect.soft(probe.consoleErrors, `${where} 콘솔 오류`).toEqual([]);
        probe.detach();
      }
    });
  }
}

const OPS_LISTS: readonly string[] = [
  "/ops/offices",
  "/ops/members",
  "/ops/registrations",
  "/ops/inquiries",
  "/ops/enterprise-leads",
  "/ops/privacy-requests",
  "/ops/deletion-queue",
  "/ops/guest-privacy-intakes",
  "/ops/import-support",
];

for (const list of OPS_LISTS) {
  test(`운영자 ${list} 첫 항목 상세`, async ({ page }) => {
    await page.goto(list);
    await settle(page);
    const href = await firstDetailHref(page, list, "body");
    expect.soft(href, "목록에서 상세 링크를 찾지 못함").not.toBeNull();
    if (href === null) return;
    const probe = attachProbe(page);
    await page.goto(href);
    await settle(page);
    const facts = await collectFacts(page);
    expect.soft(facts.headings.length, "제목 없음").toBeGreaterThan(0);
    expect.soft(facts.overflow, "가로 넘침").toBeLessThanOrEqual(1);
    expect.soft(unexpectedFailures(probe), "실패한 API 호출").toEqual([]);
    expect.soft(probe.pageErrors).toEqual([]);
    expect.soft(probe.consoleErrors).toEqual([]);
  });
}
