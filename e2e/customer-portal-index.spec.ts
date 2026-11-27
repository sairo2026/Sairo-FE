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

test("verified customer opens a confirmed visit and returns to the index", async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/api/public/customer-visit-links/portal")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              available: true,
              verified: true,
              items: [
                {
                  coordinationId: 72,
                  status: "CONFIRMED",
                  periodStartDate: "2026-12-01",
                  periodEndDate: "2026-12-01",
                  canRespond: false,
                  canViewSchedule: true,
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/api/public/customer-visit-links/portal/requests/72/confirmed")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              state: "VALID",
              scheduleVersion: 1,
              managerDisplayName: "담당자",
              managerLegalRole: "REPRESENTATIVE_AGENT",
              officeContactPhone: "02-000-0000",
              items: [
                {
                  sortOrder: 1,
                  scheduledStartAt: "2026-12-01T17:00:00+09:00",
                  scheduledEndAt: "2026-12-01T17:30:00+09:00",
                  propertyAddress: "서울시 테스트 매물",
                  travelDurationMinutes: null,
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return originalFetch(input, init);
    };
  });
  await page.goto("/visit/portal");
  await page.getByRole("link", { name: "확정 일정 확인" }).click();
  await expect(page).toHaveURL(/\/visit\/portal\/72\/confirmed$/);
  await expect(page.getByText("확정된 방문 1건을 확인할 수 있습니다.")).toBeVisible();
  await expect(page.getByText(/서울시 테스트 매물/)).toBeVisible();
  await page.screenshot({
    path: `test-results/customer-portal-confirmed-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "이전 화면으로 돌아가기" }).click();
  await expect(page.getByText("방문 요청 #72")).toBeVisible();
});
