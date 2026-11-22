import { expect, test } from "@playwright/test";

test("공개 화면에는 보안 헤더가 적용되고 CSP는 일부 지시어만 강제된다", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.ok()).toBe(true);
  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toBe(
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  );
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["permissions-policy"]).toContain("geolocation=()");
  expect(headers["content-security-policy-report-only"]).toContain("object-src 'none'");
  expect(headers["content-security-policy-report-only"]).toContain(
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
    expect(response.headers()["x-frame-options"]).toBe("DENY");
  });
}
