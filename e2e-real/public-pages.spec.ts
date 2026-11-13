import { expect, test } from "./support/test";

type Pricing = {
  priceVersion: string;
  plans: { planCode: string; baseAmount: number }[];
};

test("공개 요금 API와 /pricing이 게시된 표준 요금표를 보여준다", async ({ page, request }) => {
  const response = await request.get("/api/public/pricing");
  expect(response.status()).toBe(200);
  const pricing = (await response.json()) as Pricing;
  expect(pricing.priceVersion).toBe("2026-STANDARD");
  expect(pricing.plans.some((plan) => plan.baseAmount === 39900)).toBe(true);

  await page.goto("/pricing");
  await expect(
    page.getByRole("heading", { level: 1, name: "사무소 단위 월 구독 요금" }),
  ).toBeVisible();
  await expect(page.getByText("39,900").first()).toBeVisible();
  await expect(page.getByText("별도 견적").first()).toBeVisible();
  await expect(page.locator("section[role='alert']")).toHaveCount(0);
});

test("공개 사업자 정보가 응답에 있고 푸터와 약관 페이지에 표시된다", async ({ page, request }) => {
  const response = await request.get("/api/public/company-info");
  expect(response.status()).toBe(200);
  const info = (await response.json()) as { businessName: string; businessNumber: string };
  expect(info.businessName).toBeTruthy();
  expect(info.businessNumber).toMatch(/^\d{3}-\d{2}-\d{5}$/);

  await page.goto("/pricing");
  await expect(page.getByText(info.businessNumber).first()).toBeVisible();
});

for (const path of ["/legal/terms", "/legal/privacy", "/legal/refund-policy"]) {
  test(`${path} 약관 본문과 사업자 정보가 보인다`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.locator("main").first()).not.toBeEmpty();
    await expect(page.getByText("704-16-02872").first()).toBeVisible();
  });
}

test("약관 목록 API와 비로그인 컨텍스트가 계약대로 응답한다", async ({ request }) => {
  const terms = await request.get("/api/terms");
  expect(terms.status()).toBe(200);
  const context = await request.get("/api/auth/context");
  expect(context.status()).toBe(401);
});
