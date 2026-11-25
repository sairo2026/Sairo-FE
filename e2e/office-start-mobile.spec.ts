import { expect, test } from "@playwright/test";
import { settle, useMockOfficeRole } from "./support/app";

test("사무소 시작 선택과 다음 동작은 좁은 화면에서도 보인다", async ({ page }, testInfo) => {
  await useMockOfficeRole(page, "NEW");
  await page.goto("/office/start");
  await settle(page);

  const create = page.getByRole("radio", { name: /새 사무소 생성/ });
  const join = page.getByRole("radio", { name: /기존 사무소 참여/ });
  const next = page.getByRole("button", { name: "다음" });

  await expect(create).toBeVisible();
  await expect(join).toBeVisible();
  await expect(next).toBeInViewport();
  await expect(next).toBeDisabled();
  await join.focus();
  await page.keyboard.press("Space");
  await expect(join).toBeChecked();
  await expect(next).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("office-start.png"), fullPage: true });
  await next.click();
  await expect(page).toHaveURL(/\/office\/join$/);

  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 640, height: 740 });
    await page.goto("/office/start");
    await settle(page);
    await expect(page.getByRole("button", { name: "다음" })).toBeInViewport();
  }
});
