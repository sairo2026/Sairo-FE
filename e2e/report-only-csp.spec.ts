import { expect, test } from "@playwright/test";

test("공개 화면에는 차단하지 않는 CSP 헤더만 적용된다", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.ok()).toBe(true);
  expect(response?.headers()["content-security-policy"]).toBeUndefined();
  expect(response?.headers()["content-security-policy-report-only"]).toContain("object-src 'none'");
  expect(response?.headers()["content-security-policy-report-only"]).toContain(
    "script-src 'self' https://js.tosspayments.com",
  );
  await expect(page.getByRole("link", { name: "이메일로 시작하기" })).toBeVisible();
});

for (const path of ["/billing/card/result", "/ops/invitations/accept"]) {
  test(`${path}의 응답은 방문 주소를 전달하거나 저장하지 않도록 요청한다`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    expect(response.headers()["referrer-policy"]).toBe("no-referrer");
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
}
