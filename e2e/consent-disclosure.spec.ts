import { expect, test } from "@playwright/test";
import { settle, useMockOfficeRole } from "./support/app";

test("가입 안내는 접어 읽고 약관 상세에서 서버 동의 버전을 확인한다", async ({
  page,
}, testInfo) => {
  await useMockOfficeRole(page, "OWNER");
  await page.goto("/signup/email");
  await settle(page);

  const notice = page.locator("details").filter({ hasText: "개인정보 수집·이용 안내 자세히 보기" });
  await expect(notice).not.toHaveAttribute("open");
  await page.screenshot({ path: testInfo.outputPath("signup-before.png"), fullPage: true });
  await notice.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(notice).toHaveAttribute("open", "");
  await expect(notice.getByRole("table")).toBeVisible();

  const opener = page.getByRole("button", { name: /이용약관 전문 보기/ });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("시행 버전 1.0");
  await expect(dialog.getByRole("link", { name: "전문 페이지 열기" })).toHaveAttribute(
    "href",
    "/legal/previous/terms/1.0",
  );
  await page.screenshot({ path: testInfo.outputPath("signup-detail.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("구독 구매 동의는 서버의 결제·환불 조건을 체크 항목에 표시한다", async ({
  page,
}, testInfo) => {
  await useMockOfficeRole(page, "OWNER");
  await page.goto("/billing/consent");
  await settle(page);

  await expect(page.getByRole("checkbox", { name: /월 선불 자동결제에 동의합니다/ })).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /해지와 환불 조건을 확인했습니다/ }),
  ).toBeVisible();
  await expect(page.getByText(/다시 동의받기 전에는 결제되지 않습니다/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("billing-conditions.png"), fullPage: true });
});

test("버전별 공개 약관 주소는 요청한 버전의 본문을 보여준다", async ({ page }) => {
  await page.goto("/legal/policies/TERMS/1.0");
  await expect(page.getByText("이 문서는 시행 버전 1.0입니다.")).toBeVisible();
  await expect(page.getByText("시행 버전 1.0", { exact: true })).toBeVisible();
  await page.goto("/legal/policies/TERMS/1.1");
  await expect(page.getByText(/시행 버전 1.1은 2026년 12월 16일부터 시행합니다/)).toBeVisible();
});
