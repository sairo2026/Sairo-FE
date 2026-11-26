import { expect, test } from "@playwright/test";
import { callMockApi, fixMockClock } from "./support/scenario";

test("같은 브라우저의 유효한 이전 시간을 자동으로 보여주되 제출은 고객이 결정한다", async ({
  page,
}) => {
  let submissions = 0;
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/api/public/customer-visit-links/customer-token-0000001/reusable-times")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              timeSlots: [
                { startsAt: "2026-11-12T10:00:00+09:00", endsAt: "2026-11-12T11:00:00+09:00" },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return originalFetch(input, init);
    };
  });
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request
        .url()
        .includes("/api/public/customer-visit-links/customer-token-0000001/available-times")
    ) {
      submissions += 1;
    }
  });
  await fixMockClock(page);
  await page.goto("/visit-responses/customer-token-0000001");
  await expect(
    page.getByText(/이 브라우저에서 이전에 확인한 유효한 시간을 표시했습니다/),
  ).toBeVisible();
  await expect(page.getByText("선택한 시간 · 11월 12일 10:00~11:00")).toBeVisible();
  expect(submissions).toBe(0);
});

test("고객이 이전 링크의 시간을 불러와 제출 전에 직접 확인한다", async ({ page }) => {
  const submissions: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request
        .url()
        .includes("/api/public/customer-visit-links/customer-token-0000001/available-times")
    ) {
      submissions.push(request.url());
    }
  });
  await fixMockClock(page);
  await page.goto("/visit-responses/customer-token-0000001");
  await page.getByLabel("이전 방문 조율 링크").fill("previous-customer-token-0000001");
  await page.getByRole("button", { name: "시간 불러오기" }).click();
  await expect(page.getByText(/표시 가능한 이전 시간을 현재 선택에 추가했습니다/)).toBeVisible();
  await expect(page.getByText("선택한 시간 · 11월 12일 10:00~11:00")).toBeVisible();
  await expect(page.getByLabel("이전 방문 조율 링크")).toHaveValue("");
  expect(submissions).toHaveLength(0);
  const stored = await callMockApi(
    page,
    "GET",
    "/api/public/customer-visit-links/customer-token-0000001",
  );
  expect(stored.status).toBe(200);
  expect((stored.body as { submittedTimeSlots: unknown[] }).submittedTimeSlots).toEqual([]);
  await page.reload();
  await expect(page.getByText("선택한 시간이 없습니다.")).toBeVisible();
});
