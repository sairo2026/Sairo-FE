import { expect, test } from "@playwright/test";
import { callMockApi, fixMockClock } from "./support/scenario";

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
