import { expect, type Page } from "@playwright/test";

/**
 * 모의 API 상태는 페이지 메모리에 있어 page.goto로 다시 열면 처음 값으로 돌아간다.
 * 같은 시나리오 안에서 상태를 이어 가야 할 때는 화면 이동을 클라이언트 이동으로 한다.
 */
export async function clientNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    const router = (window as unknown as { next?: { router?: { push(url: string): void } } }).next
      ?.router;
    if (!router) throw new Error("Next 라우터를 찾을 수 없습니다.");
    router.push(target);
  }, path);
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}`.startsWith(path));
}

export type ApiResult = { status: number; body: unknown };

/** 화면에서 보낼 수 없는 요청을 같은 페이지의 모의 API로 보낸다. 응답은 서비스 워커가 만든다. */
export async function callMockApi(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<ApiResult> {
  return page.evaluate(
    async ({ method, path, body, headers }) => {
      const response = await fetch(path, {
        method,
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      return { status: response.status, body: text ? (JSON.parse(text) as unknown) : null };
    },
    { method, path, body, headers },
  );
}

/** 서울 기준 오늘에서 days만큼 옮긴 날짜를 YYYY-MM-DD로 돌려준다. */
export function seoulDate(days = 0): string {
  const shifted = new Date(Date.now() + 9 * 60 * 60 * 1000 + days * 24 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** 모의 API의 고정 기준 시각(2026-11-10 09:00 KST) 직후로 브라우저 시계를 고정한다. 타이머는 그대로 흐른다. */
export const MOCK_NOW = "2026-11-10T09:30:00+09:00";

export async function fixMockClock(page: Page, at: string = MOCK_NOW): Promise<void> {
  await page.clock.setFixedTime(new Date(at));
}
