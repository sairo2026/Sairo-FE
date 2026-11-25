import { expect, test } from "@playwright/test";

test("공개 화면에는 nonce 기반 CSP가 강제되고 위반 없이 화면이 동작한다", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cspViolations: string[] }).__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
        `${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });
  const response = await page.goto("/login");
  expect(response?.ok()).toBe(true);
  const headers = response?.headers() ?? {};
  const policy = headers["content-security-policy"] ?? "";
  expect(policy).toMatch(
    /script-src 'self' 'nonce-[^']+' 'strict-dynamic' https:\/\/js\.tosspayments\.com/,
  );
  const scriptDirective = policy.split("; ").find((d) => d.startsWith("script-src")) ?? "";
  expect(scriptDirective).not.toContain("'unsafe-inline'");
  expect(scriptDirective).not.toContain("'unsafe-eval'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy-report-only"]).toBeUndefined();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["permissions-policy"]).toContain("geolocation=()");
  await expect(page.getByRole("link", { name: "이메일로 로그인하기" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const violations = await page.evaluate(
    () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
  );
  expect(violations).toEqual([]);
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
