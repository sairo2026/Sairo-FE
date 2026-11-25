import { expect, test } from "@playwright/test";
import { settle, useMockOfficeRole } from "./support/app";

test("결제 전 대표가 코드를 적용하면 카드 청구 없이 무료 상태로 이동한다", async ({ page }) => {
  await useMockOfficeRole(page, "OWNER");
  await page.addInitScript(() => {
    let applied = false;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url, window.location.origin);
      if (url.origin !== window.location.origin) return originalFetch(input, init);
      if (url.pathname === "/api/billing/promotion-periods/redeem" && request.method === "POST") {
        const body = (await request.clone().json()) as { code: string };
        if (body.code !== "LAUNCH2026OWNER01") return Response.json({}, { status: 409 });
        applied = true;
        return Response.json({ id: 17 }, { status: 201 });
      }
      if (url.pathname === "/api/billing/promotion-periods/current" && applied) {
        return Response.json({
          campaignName: "출시 프로모션",
          campaignCode: "LAUNCH2026OWNER01",
          startsAt: "2027-01-31T14:30:00+09:00",
          freeEndsAt: "2027-03-31T14:30:00+09:00",
          nextFreeRenewalAt: "2027-02-28T14:30:00+09:00",
          conversionStatus: "CONFIRMATION_REQUIRED",
          potentialPaidAmount: 49900,
        });
      }
      const response = await originalFetch(input, init);
      if (url.pathname === "/api/subscriptions/current" && response.ok) {
        const body = (await response.json()) as Record<string, unknown>;
        return Response.json({ ...body, status: applied ? "TRIAL" : "PRE_PAYMENT" });
      }
      return response;
    };
  });

  const cardCharges: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/subscriptions\/(first-payment|retry-payment)/.test(request.url())) {
      cardCharges.push(request.url());
    }
  });
  await page.goto("/billing/promotion-periods");
  await settle(page);
  await expect(page.getByRole("textbox", { name: "프로모션 코드" })).toBeVisible();
  await page.getByRole("textbox", { name: "프로모션 코드" }).fill("launch2026owner01");
  await page.getByRole("button", { name: "무료 프로모션 적용하기" }).click();
  await expect(page.getByText("현재 프로모션")).toBeVisible();
  await expect(page.getByText(/무료 종료만으로 카드가 자동 청구되지 않습니다/)).toBeVisible();
  expect(cardCharges).toHaveLength(0);
});
