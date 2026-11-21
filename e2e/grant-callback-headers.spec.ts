import { expect, test } from "@playwright/test";

test("반환·보관 본인 확인 페이지는 캐싱과 리퍼러 전송을 막는다", async ({ request }) => {
  const response = await request.get("/grant/verify");

  expect(response.ok()).toBe(true);
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response.headers()["cache-control"]).toContain("no-store");
});
