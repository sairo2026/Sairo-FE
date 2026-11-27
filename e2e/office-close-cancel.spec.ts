import { expect, test } from "@playwright/test";
import { settle, useMockOfficeRole } from "./support/app";

test("사무소 종료 취소는 보조 CTA로 표시하고 사무소 관리로 돌아간다", async ({
  page,
}, testInfo) => {
  await useMockOfficeRole(page, "OWNER");
  await page.goto("/office/close");
  await settle(page);

  const submit = page.getByRole("button", { name: "사무소 종료" });
  const cancel = page.getByRole("link", { name: "취소" });
  await expect(submit).toBeVisible();
  await expect(cancel).toBeVisible();
  await expect(cancel).toHaveAttribute("href", "/office");

  const submitBox = await submit.boundingBox();
  const cancelBox = await cancel.boundingBox();
  if (!submitBox || !cancelBox) throw new Error("Action button layout is unavailable");
  expect(cancelBox.height).toBe(submitBox.height);
  expect(cancelBox.width).toBeGreaterThanOrEqual(120);
  await expect(cancel).toHaveCSS("background-color", "rgb(238, 238, 251)");
  if (testInfo.project.name === "mobile") {
    expect(submitBox.width).toBeGreaterThanOrEqual(240);
    expect(cancelBox.width).toBeGreaterThanOrEqual(240);
    expect(cancelBox.y).toBeGreaterThan(submitBox.y);
  }
  await page.screenshot({ path: testInfo.outputPath("office-close-cancel.png"), fullPage: true });

  await cancel.click();
  await expect(page).toHaveURL(/\/office$/);
});
