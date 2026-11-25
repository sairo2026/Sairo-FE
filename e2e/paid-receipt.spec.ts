import { expect, test } from "@playwright/test";
import { settle, useMockOfficeRole } from "./support/app";

test("승인된 결제 시도에만 Toss 매출전표 링크를 표시한다", async ({ page }) => {
  await useMockOfficeRole(page, "OWNER");
  await page.goto("/billing/invoices/501");
  await settle(page);
  const receipt = page.getByRole("link", { name: "Toss 매출전표 보기" });
  await expect(receipt).toBeVisible();
  await expect(receipt).toHaveAttribute(
    "href",
    "https://dashboard.tosspayments.com/sales-slip?transactionId=mock-only",
  );
  await expect(receipt).toHaveAttribute("rel", "noopener noreferrer");
});
