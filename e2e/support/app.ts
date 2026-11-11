import type { Page } from "@playwright/test";

export type MockOfficeRole = "OWNER" | "AGENT" | "DEPUTY";

export const MOCK_ROLE_STORAGE_KEY = "sairo-mock-office-role";

/** 모의 API가 켜진 빌드에서 첫 화면이 열리기 전에 사무소 역할을 정한다. */
export async function useMockOfficeRole(page: Page, role: MockOfficeRole | null): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    },
    [MOCK_ROLE_STORAGE_KEY, role] as const,
  );
}

/** 화면이 자료를 다 불러올 때까지 기다린다. 로딩 표시가 남아 있으면 시간 안에 포기한다. */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page
    .waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, {
      timeout: 15_000,
    })
    .catch(() => undefined);
  await page.waitForTimeout(300);
}
