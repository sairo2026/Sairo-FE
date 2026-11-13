import { expect, test } from "@playwright/test";

const api = "http://127.0.0.1:8080";

test("public pricing API returns the published standard price schedule", async ({ request }) => {
  const response = await request.get(`${api}/api/public/pricing`);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    priceVersion: string;
    plans: { planCode: string; baseAmount: number; perSeatAmount: number | null }[];
  };
  expect(body.priceVersion).toBe("2026-STANDARD");
  expect(body.plans.find((plan) => plan.planCode === "SOLO")?.baseAmount).toBe(39900);
  expect(body.plans.some((plan) => plan.perSeatAmount === 10000)).toBe(true);
  expect(body.plans.some((plan) => plan.perSeatAmount === 8000)).toBe(true);
});

test("public pages render without a login and the pricing page shows the published amounts", async ({
  page,
}) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "사무소 단위 월 구독 요금" })).toBeVisible();
  await expect(page.getByText(/월 39,900원/).first()).toBeVisible();

  for (const path of ["/", "/legal", "/legal/terms", "/legal/privacy", "/signup", "/login"]) {
    await page.goto(path);
    await expect(page.locator("main, body").first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/(home|ops)(\/|$)/);
  }
});
