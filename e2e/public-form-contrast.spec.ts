import { expect, test } from "@playwright/test";
import { useMockOfficeRole } from "./support/app";

test("이메일 가입의 보조 문구 대비를 공개 화면 범위 안에서 개선한다", async ({ page }) => {
  await useMockOfficeRole(page, null);
  await page.goto("/signup/email");
  const note = page
    .locator(
      '[data-public-contrast] :is(.text-ink-3, .text-muted):not(:disabled):not([aria-disabled="true"]):visible',
    )
    .first();
  await expect(note).toHaveCSS("color", "rgb(89, 98, 115)");
  await page.goto("/login");
  await expect(page.locator("[data-public-contrast]")).toHaveCount(0);
});
