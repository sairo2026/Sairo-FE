import { expect, test, type Page } from "@playwright/test";
import { useMockOfficeRole } from "./support/app";
import { fixMockClock } from "./support/scenario";

const CONTEXT_FAULTS_KEY = "sairo-mock-context-faults";
const RECONNECTING = "서비스에 다시 연결하는 중입니다";
const GENERIC_ERROR = "문제가 발생했습니다";

test.describe.configure({ retries: 0 });

test.beforeEach(async ({ page }) => {
  await fixMockClock(page);
  await useMockOfficeRole(page, "OWNER");
});

/** 접근 상태 확인이 앞에서부터 이 상태 코드로 한 번씩 실패하게 한다. */
async function failContext(page: Page, statuses: readonly number[]): Promise<void> {
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
    CONTEXT_FAULTS_KEY,
    statuses.join(","),
  ] as const);
}

test("서버가 재시작하며 502를 돌려줘도 오류 화면 없이 다시 연결해 홈을 연다", async ({ page }) => {
  await failContext(page, [502, 502, 502, 502]);
  await page.goto("/home");

  await expect(page.getByRole("heading", { name: RECONNECTING })).toBeVisible();
  await expect(page.getByRole("button", { name: "지금 다시 시도" })).toBeVisible();
  await expect(page.getByRole("heading", { name: GENERIC_ERROR })).toHaveCount(0);

  await expect(page.getByRole("heading", { name: RECONNECTING })).toBeHidden({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: GENERIC_ERROR })).toHaveCount(0);
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator("main").first()).toBeVisible();
});

test("재연결 중 세션이 없는 것으로 확인되면 로그인 화면으로 이동한다", async ({ page }) => {
  await failContext(page, [502, 502, 502, 502, 401]);
  await page.goto("/home");

  await expect(page.getByRole("heading", { name: RECONNECTING })).toBeVisible();
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: GENERIC_ERROR })).toHaveCount(0);
});
