import { expect, test } from "@playwright/test";
import { useMockOfficeRole } from "../support/app";
import { fixMockClock } from "../support/scenario";

// 개발플로우 4장 시나리오 6: 전세 계약 초안 부분 저장 → 필수값 완성 후 체결 → 재계약
// → 기존 계약 상태 유지 → 별도 정상 종료 처리와 D-90 후속업무 확인
test.describe("시나리오 6 전세 계약 초안부터 재계약과 정상 종료까지", () => {
  test.beforeEach(async ({ page }) => {
    await fixMockClock(page);
    await useMockOfficeRole(page, "OWNER");
  });

  test("초안을 체결하고 재계약한 뒤 기존 계약을 따로 정상 종료한다", async ({ page }) => {
    await test.step("/contracts/new에서 거래유형과 담당자만 넣어 초안을 저장한다", async () => {
      await page.goto("/contracts/new?propertyId=502");
      await expect(page.getByRole("heading", { name: "계약 등록" })).toBeVisible();
      await page.getByLabel(/거래유형/).selectOption("JEONSE");
      const manager = page.getByLabel(/담당 공인중개사/);
      await expect(manager.locator("option", { hasText: "이중개" })).toHaveCount(1);
      await manager.selectOption({ label: "이중개" });
      await page.getByRole("button", { name: "초안 저장" }).click();
      await expect(page).toHaveURL(/\/contracts\/9200$/);
      await expect(page.getByRole("list", { name: "계약 세 가지 상태" })).toContainText("초안");
    });

    await test.step("초안 수정에서 필수값을 채워 체결 등록한다", async () => {
      await page.getByRole("link", { name: "초안 수정" }).click();
      await expect(page).toHaveURL(/\/contracts\/9200\/edit$/);
      await page.getByLabel("체결일", { exact: true }).fill("2025-01-10");
      await page.getByLabel("매도·임대인 1 이름").fill("박임대");
      await page.getByLabel("매수·임차인 1 이름").fill("최임차");
      await page.getByLabel("보증금(원)", { exact: true }).fill("300000000");
      await page.getByLabel("임대 시작일", { exact: true }).fill("2025-02-08");
      await page.getByLabel("임대 만기일", { exact: true }).fill("2027-01-09");
      await page.getByLabel("잔금 예정일", { exact: true }).fill("2025-02-01");
      await page.getByRole("button", { name: "체결 등록" }).click();
      await expect(page).toHaveURL(/\/contracts\/9200$/);
      await expect(page.getByRole("list", { name: "계약 세 가지 상태" })).toContainText("체결");
    });

    await test.step("만기 90일 안의 체결 계약 목록에 이 계약이 나온다", async () => {
      await page.getByRole("link", { name: /홈 \(오늘 할 일\)/ }).click();
      await page.getByRole("link", { name: /계약 만기 D-90/ }).click();
      await expect(page).toHaveURL(/\/contracts\?tab=maturity/);
      const row = page
        .getByRole("table", { name: "계약 목록" })
        .getByRole("row")
        .filter({ hasText: "2027-01-09" });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText("체결");
      await row.getByRole("link").first().click();
      await expect(page).toHaveURL(/\/contracts\/9200$/);
    });

    await test.step("재계약을 등록하면 새 계약이 기존 계약을 이전 계약으로 가리킨다", async () => {
      await page.getByRole("link", { name: "재계약" }).click();
      await expect(page.getByRole("heading", { name: "재계약" })).toBeVisible();
      await expect(page.getByLabel(/거래유형/)).toBeDisabled();
      const manager = page.getByLabel(/담당 공인중개사/);
      await expect(manager.locator("option", { hasText: "이중개" })).toHaveCount(1);
      await manager.selectOption({ label: "이중개" });
      await page.getByLabel("체결일", { exact: true }).fill("2026-11-09");
      await page.getByLabel("임대 시작일", { exact: true }).fill("2027-01-10");
      await page.getByLabel("임대 만기일", { exact: true }).fill("2029-01-09");
      await page.getByLabel("잔금 예정일", { exact: true }).fill("2027-01-10");
      await page.getByRole("button", { name: "재계약 등록" }).click();
      await expect(page).toHaveURL(/\/contracts\/9201$/);
      await expect(page.getByRole("link", { name: "계약 9200" })).toBeVisible();
    });

    await test.step("기존 계약은 재계약 뒤에도 체결 상태를 유지한다", async () => {
      await page.getByRole("link", { name: "계약 9200" }).click();
      await expect(page).toHaveURL(/\/contracts\/9200$/);
      await expect(page.getByRole("list", { name: "계약 세 가지 상태" })).toContainText("체결");
    });

    await test.step("기존 계약을 별도로 정상 종료 처리한다", async () => {
      await page.getByRole("button", { name: "상태 변경" }).first().click();
      const dialog = page.getByRole("dialog", { name: "계약 상태 변경" });
      await dialog.getByLabel("바꿀 상태").selectOption({ label: "종료" });
      await dialog.getByLabel("실제 효력 날짜").fill("2026-11-09");
      await dialog.getByLabel("실제 효력 시간").fill("10:00");
      await dialog.getByLabel("사유", { exact: true }).fill("만기 정상 종료");
      await dialog.getByRole("button", { name: "상태 변경" }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("list", { name: "계약 세 가지 상태" })).toContainText("종료");
    });
  });

  test.fixme("체결 계약의 만기 90일 전 후속업무가 후속업무 화면과 업무 목록에 생성된다 (모의 API 공백: 후속업무 모의 저장소에 생성 처리가 없고 홈의 D-90 값은 고정이다)", async () => {});
});
