import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { settle, useMockOfficeRole } from "./support/app";

test("무료 프로모션 이용내역서를 한글 PDF로 직접 내려받는다", async ({ page }) => {
  await useMockOfficeRole(page, "OWNER");
  await page.goto("/billing/promotion-periods/17");
  await settle(page);
  await expect(page.getByRole("heading", { name: "무료 프로모션 이용내역서" })).toBeVisible();

  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF 다운로드" }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe("sairo-free-promotion-17.pdf");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const pdf = await PDFDocument.load(Buffer.concat(chunks));
  expect(pdf.getPageCount()).toBe(1);
  expect(pdf.getTitle()).toBe("무료 프로모션 이용내역서");
});
