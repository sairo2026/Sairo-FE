import { expect, test, type Page } from "@playwright/test";
import { settle, useMockOfficeRole } from "./support/app";
import { fixMockClock } from "./support/scenario";

// 컨트롤을 눌러도 스크롤 위치가 바뀌지 않고, 화면 맨 아래 요소가 잘리지 않는지 확인한다.
// 모의 자료가 적어도 문서가 스크롤되도록 뷰포트 높이를 낮춰서 본다.
const SHORT_VIEWPORT_HEIGHT = 320;

async function shrinkViewport(page: Page) {
  const size = page.viewportSize();
  if (!size) throw new Error("뷰포트 크기를 알 수 없습니다.");
  await page.setViewportSize({ width: size.width, height: SHORT_VIEWPORT_HEIGHT });
}

type Center = { x: number; y: number };

/**
 * 선택자에 맞는 첫 번째 요소를 화면 가운데로 가져온 뒤 중심 좌표를 돌려준다.
 * 스크롤 위치를 바꾸지 않고 누르려고 Playwright의 자동 스크롤 대신 마우스 좌표 클릭을 쓴다.
 */
async function bringToCenter(page: Page, selector: string): Promise<Center> {
  const center = await page.evaluate((target) => {
    const element = document.querySelector<HTMLElement>(target);
    if (!element) return null;
    element.scrollIntoView({ block: "center", inline: "nearest" });
    const rect = (element.closest("label") ?? element).getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, selector);
  if (!center) throw new Error(`요소를 찾지 못했습니다: ${selector}`);
  return center;
}

type ScrollSnapshot = { windowY: number; containers: number[] };

async function snapshot(page: Page): Promise<ScrollSnapshot> {
  return page.evaluate(() => {
    const containers = Array.from(document.querySelectorAll<HTMLElement>("*")).filter((element) => {
      const overflowY = getComputedStyle(element).overflowY;
      return (
        (overflowY === "auto" || overflowY === "scroll") &&
        element.scrollHeight > element.clientHeight + 1
      );
    });
    return { windowY: window.scrollY, containers: containers.map((element) => element.scrollTop) };
  });
}

async function expectScrollUnchanged(
  page: Page,
  selector: string,
  options: { comparesContainers: boolean } = { comparesContainers: true },
) {
  const center = await bringToCenter(page, selector);
  await page.waitForTimeout(100);
  const before = await snapshot(page);
  expect(before.windowY, "스크롤이 중간에 있어야 의미 있는 시험입니다").toBeGreaterThan(0);
  await page.mouse.click(center.x, center.y);
  await page.waitForTimeout(400);
  const after = await snapshot(page);
  expect(after.windowY).toBe(before.windowY);
  // 목록 자료가 바뀌는 컨트롤(보관 토글)은 스크롤 컨테이너 자체가 달라질 수 있어 window 위치만 본다.
  if (options.comparesContainers) {
    expect(after.containers.slice(0, before.containers.length)).toEqual(before.containers);
  }
}

test.describe("컨트롤을 눌러도 스크롤 위치가 유지된다", () => {
  test.beforeEach(async ({ page }) => {
    await fixMockClock(page);
    await useMockOfficeRole(page, "OWNER");
    await shrinkViewport(page);
  });

  test("방문 조율 만들기: 라디오와 체크박스", async ({ page }) => {
    await page.goto("/coordinations/new");
    await settle(page);
    await expectScrollUnchanged(page, 'input[type="radio"][name="visit-customer"]');
    await expectScrollUnchanged(page, 'input[type="checkbox"][aria-label$=" 선택"]');
  });

  test("고객 목록: 선택 열 체크박스, 보관 토글", async ({ page }) => {
    await page.goto("/customers");
    await settle(page);
    await expectScrollUnchanged(page, 'input[type="checkbox"][aria-label$=" 선택"]');
    await expectScrollUnchanged(page, 'button[role="switch"]', { comparesContainers: false });
  });
});

test.describe("화면 맨 아래 요소가 잘리지 않는다", () => {
  test.beforeEach(async ({ page }) => {
    await fixMockClock(page);
    await useMockOfficeRole(page, "OWNER");
    await shrinkViewport(page);
  });

  async function scrollToEnd(page: Page) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
  }

  async function expectFullyVisible(page: Page, selector: string) {
    const box = await page.evaluate((target) => {
      const element = document.querySelector(target);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, viewport: window.innerHeight };
    }, selector);
    if (!box) throw new Error(`${selector} 요소가 있어야 합니다`);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(box.viewport);
  }

  test("홈: 스크롤 끝에서 캘린더 카드 전체가 보이고 아래 안내가 사라진다", async ({ page }) => {
    // 카드(약 520px)가 통째로 들어갈 만큼의 높이로 늘린다.
    await page.setViewportSize({ width: page.viewportSize()?.width ?? 1280, height: 720 });
    await page.goto("/home");
    await settle(page);
    const hint = page.locator('[data-testid="more-below-hint"].fixed');
    await expect(hint).toHaveAttribute("data-visible", "true");
    await scrollToEnd(page);
    await expectFullyVisible(page, 'section[aria-labelledby="home-calendar"]');
    await expect(hint).toHaveAttribute("data-visible", "false");
  });

  test("방문 조율 목록: 스크롤 끝에서 페이지 이동 줄 전체가 보인다", async ({ page }) => {
    await page.goto("/coordinations");
    await settle(page);
    await scrollToEnd(page);
    await expectFullyVisible(page, 'nav[aria-label$="페이지 이동"]');
  });

  test("방문 조율 만들기: 후보 매물 목록과 다음 제목이 겹치지 않고 스크롤바가 보인다", async ({
    page,
  }) => {
    await page.goto("/coordinations/new");
    await settle(page);
    const list = page.getByRole("group", { name: "우리 사무소 매물 목록" });
    await expect(list).toBeVisible();
    const gap = await page.evaluate(() => {
      const listBox = document
        .querySelector('[role="group"][aria-label="우리 사무소 매물 목록"]')
        ?.getBoundingClientRect();
      const heading = Array.from(document.querySelectorAll("h2")).find(
        (element) => element.textContent?.trim() === "허용받은 매물",
      );
      if (!listBox || !heading) return null;
      return heading.getBoundingClientRect().top - listBox.bottom;
    });
    if (gap === null) throw new Error("후보 매물 목록 또는 다음 제목을 찾지 못했습니다.");
    expect(gap).toBeGreaterThanOrEqual(8);
    const scrollbarWidth = await list.evaluate(
      (element) => getComputedStyle(element).scrollbarWidth,
    );
    expect(scrollbarWidth).toBe("thin");
  });
});

test.describe("방문 가능 기간 입력", () => {
  test("방문 조율 만들기: 종료일 상한(오늘 + 30일)과 안내 문구가 같은 날짜를 가리킨다", async ({
    page,
  }) => {
    await fixMockClock(page);
    await useMockOfficeRole(page, "OWNER");
    await page.goto("/coordinations/new");
    await settle(page);
    const max = await page.getByLabel("방문 가능 종료일").getAttribute("max");
    expect(max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await expect(
      page.getByText(
        `방문 가능 기간은 오늘부터 30일 안으로 정해 주세요. 종료일은 ${max}까지 고를 수 있습니다.`,
      ),
    ).toBeVisible();
  });
});
