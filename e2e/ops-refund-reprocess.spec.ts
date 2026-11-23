import { expect, test, type Page } from "@playwright/test";

async function passStepUp(page: Page) {
  const dialog = page.getByRole("dialog", { name: "운영자 재인증" });
  await dialog.getByLabel("확인 코드").fill("123456");
  await dialog.getByRole("button", { name: "확인", exact: true }).click();
}

test.describe("실패한 환불 재처리 (모의 API)", () => {
  test("환불 목록에서 실패 상태로 걸러 상세로 들어간다", async ({ page }) => {
    await page.goto("/ops/billing/refunds");
    await page.getByLabel("환불 상태").selectOption("FAILED");
    await page.getByRole("button", { name: "조회" }).click();
    const table = page.getByRole("table", { name: "환불 신청 목록" });
    await expect(table.getByRole("link", { name: "7", exact: true })).toBeVisible();
    await expect(table.getByText("승인 지연")).toBeVisible();
    await table.getByRole("link", { name: "7", exact: true }).click();
    await expect(page.getByText("실패 사유")).toBeVisible();
  });

  test("다시 열기는 두 확인을 채우고 재인증을 거치면 승인 상태가 되어 환불 실행으로 완료된다", async ({
    page,
  }) => {
    await page.goto("/ops/billing/refunds/7");
    await page.getByRole("button", { name: "다시 열기" }).click();
    const dialog = page.getByRole("dialog", { name: "실패한 환불 다시 열기" });
    const submit = dialog.getByRole("button", { name: "다시 열기" });
    await expect(submit).toBeDisabled();
    await dialog.getByLabel(/다시 여는 사유/).fill("PG 관리자 화면에서 미취소 확인");
    await expect(submit).toBeDisabled();
    await dialog.getByLabel(/PG에서 취소되지 않은 것을 확인했습니다/).check({ force: true });
    await expect(submit).toBeEnabled();
    await submit.click();
    await passStepUp(page);
    await expect(page.getByText(/환불을 승인 상태로 되돌렸습니다/)).toBeVisible();
    await page.getByRole("button", { name: "환불 실행" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "환불 실행" }).click();
    await expect(page.getByText("환불을 완료했습니다.")).toBeVisible();
  });

  test("수동 완료는 근거와 사유와 확인을 채우고 재인증을 거치면 완료로 닫힌다", async ({
    page,
  }) => {
    await page.goto("/ops/billing/refunds/10");
    await page.getByRole("button", { name: "수동 완료" }).click();
    const dialog = page.getByRole("dialog", { name: "실패한 환불 수동 완료" });
    await dialog.getByLabel(/PG 취소 근거/).fill("TOSS-CANCEL-1");
    await dialog.getByLabel(/직접 처리한 사유/).fill("PG 관리자 화면에서 직접 취소");
    await dialog.getByLabel(/PG 콘솔에서 직접 취소한 것을 확인했습니다/).check({ force: true });
    await dialog.getByRole("button", { name: "수동 완료" }).click();
    await passStepUp(page);
    await expect(page.getByText("수동 처리로 환불을 완료했습니다.")).toBeVisible();
    await expect(page.getByRole("button", { name: "수동 완료" })).toHaveCount(0);
    await expect(page.getByText("환불 완료", { exact: true }).first()).toBeVisible();
  });

  test("내가 승인한 정책 외 보상은 수동 완료 버튼이 꺼진다", async ({ page }) => {
    await page.goto("/ops/billing/refunds/11");
    await expect(page.getByRole("button", { name: "수동 완료" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "다시 열기" })).toBeEnabled();
  });
});
