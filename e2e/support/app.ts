import type { Page } from "@playwright/test";

export type MockOfficeRole =
  | "OWNER"
  | "AGENT"
  | "DEPUTY"
  | "NEW"
  | "OWNER_OVERDUE"
  | "AGENT_OVERDUE"
  | "DEPUTY_OVERDUE"
  | "OWNER_UNPAID"
  | "AGENT_UNPAID"
  | "OWNER_REVIEW"
  | "AGENT_REVIEW"
  | "OWNER_REVOKED"
  | "OWNER_SUSPENDED"
  | "AGENT_REVOKED"
  | "REMOVED"
  | "RETURN_EXPIRED";

export const MOCK_OPS_ROLES_STORAGE_KEY = "sairo-mock-ops-roles";

/** 운영 콘솔에서 보유 역할을 쉼표 목록으로 줄인다. 첫 화면이 열리기 전에 적용한다. */
export async function useMockOpsRoles(page: Page, roles: readonly string[]): Promise<void> {
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
    MOCK_OPS_ROLES_STORAGE_KEY,
    roles.join(","),
  ] as const);
}

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
