import { expect, test } from "@playwright/test";

test("verified customer can return to the request index and end the session", async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = (
        init?.method ?? (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      if (url.endsWith("/api/public/customer-visit-links/portal")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              available: true,
              verified: window.sessionStorage.getItem("portal-verified") === "yes",
              items:
                window.sessionStorage.getItem("portal-verified") === "yes"
                  ? [
                      {
                        coordinationId: 71,
                        status: "TIME_COLLECTING",
                        periodStartDate: "2026-11-11",
                        periodEndDate: "2026-11-20",
                      },
                    ]
                  : [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/api/public/customer-visit-links/portal/logout") && method === "POST") {
        window.sessionStorage.removeItem("portal-verified");
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return originalFetch(input, init);
    };
  });
  await page.goto("/visit/portal");
  await expect(page.getByText(/이메일 인증을 완료하면/)).toBeVisible();
  await page.evaluate(() => window.sessionStorage.setItem("portal-verified", "yes"));
  await page.reload();
  await expect(page.getByText("방문 요청 #71")).toBeVisible();
  await expect(page.getByText("2026-11-11 ~ 2026-11-20")).toBeVisible();
  await page.getByRole("button", { name: "이 기기에서 보기 종료" }).click();
  await expect(page.getByText(/이메일 인증을 완료하면/)).toBeVisible();
  await expect(page.getByText("방문 요청 #71")).toHaveCount(0);
});
