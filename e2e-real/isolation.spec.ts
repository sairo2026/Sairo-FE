import { expect, test } from "./support/test";

test("실 API 브라우저의 외부 인증과 결제 요청을 차단한다", async ({ page }) => {
  for (const provider of ["https://oauth.example.invalid", "https://payments.example.invalid"]) {
    await expect(page.goto(provider)).rejects.toThrow(/BLOCKED_BY_CLIENT/);
  }
});
