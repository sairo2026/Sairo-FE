import { expect, test } from "@playwright/test";
import { settle, useMockOfficeRole } from "./support/app";

test("업무 도움말의 대비를 높이고 공개 화면의 색상 범위를 보호한다", async ({ page }) => {
  await useMockOfficeRole(page, "OWNER");
  await page.goto("/home");
  await settle(page);
  const help = page.locator("[data-workspace] .text-muted:visible").first();
  await expect(help).toHaveCSS("color", "rgb(89, 98, 115)");

  await page.goto("/login/email");
  await expect(page.locator("[data-workspace]")).toHaveCount(0);
  const publicMuted = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim(),
  );
  expect(publicMuted).toBe("#9ca3af");
});
