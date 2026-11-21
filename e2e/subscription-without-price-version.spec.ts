import { expect, test } from "@playwright/test";
import { useMockOfficeRole } from "./support/app";

test("가격표가 선택되기 전에도 현재 구독 정보와 카드 등록 안내를 연다", async ({ page }) => {
  await useMockOfficeRole(page, "OWNER");
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const requestUrl = input instanceof Request ? input.url : input;
      const url = new URL(requestUrl, window.location.origin);
      if (
        response.ok &&
        url.origin === window.location.origin &&
        url.pathname === "/api/subscriptions/current"
      ) {
        const payload = (await response.json()) as Record<string, unknown>;
        return Response.json({ ...payload, priceVersion: null });
      }
      return response;
    };
  });

  await page.goto("/billing");
  await expect(page.getByText(/과금 인원/)).toBeVisible();
  await expect(page.getByText(/가격 버전/)).toHaveCount(0);

  await page.goto("/billing/card");
  await expect(page.getByRole("checkbox", { name: /위 안내를 확인했습니다/ })).toBeVisible();
});
