import { expect, test } from "@playwright/test";
import { useMockOfficeRole } from "../support/app";
import { clientNavigate } from "../support/scenario";

// 개발플로우 4장 시나리오 2: 매물 등록 → 커스텀 카테고리·필드 추가
test("시나리오 2 매물을 활성 등록하고 커스텀 카테고리와 입력 항목을 추가해 새 매물에 쓴다", async ({
  page,
}) => {
  await useMockOfficeRole(page, "OWNER");

  await test.step("/properties/new에서 아파트 매물을 활성 등록한다", async () => {
    await page.goto("/properties");
    await page.getByRole("link", { name: "+ 매물 등록" }).click();
    await expect(page.getByRole("heading", { name: "매물 등록" })).toBeVisible();
    await page.getByLabel(/^매물명/).fill("E2E 아파트");
    await expect(page.getByLabel(/^카테고리/).locator("option", { hasText: "아파트" })).toHaveCount(
      1,
    );
    await page.getByLabel(/^카테고리/).selectOption({ label: "아파트" });
    await page.getByLabel("매물 주소").fill("서울특별시 종로구 시험로 1");
    await page.getByLabel("담당 공인중개사").selectOption("2");
    await page.getByRole("button", { name: "활성 등록" }).click();
    await expect(page).toHaveURL(/\/properties\/9\d\d$/);
    await expect(page.getByRole("heading", { level: 1, name: "E2E 아파트" })).toBeVisible();
    await expect(page.getByText("활성", { exact: true }).first()).toBeVisible();
  });

  await test.step("/properties/categories에서 커스텀 카테고리와 숫자 입력 항목을 만든다", async () => {
    await clientNavigate(page, "/properties");
    await page.getByRole("link", { name: "카테고리 관리" }).click();
    await expect(page.getByRole("heading", { name: "카테고리·입력 항목 관리" })).toBeVisible();
    await page.getByLabel("새 카테고리 이름").fill("창고형 상가");
    await page.getByRole("button", { name: "카테고리 만들기" }).click();
    await expect(page.getByText("카테고리를 만들었습니다.")).toBeVisible();
    await page.getByRole("button", { name: "창고형 상가", exact: true }).click();
    await expect(page.getByText("등록된 입력 항목이 없습니다.")).toBeVisible();
    await page.getByLabel("새 입력 항목 이름").fill("층고");
    await page.getByLabel("입력 항목 형식").selectOption("NUMBER");
    await page.getByRole("button", { name: "입력 항목 추가" }).click();
    await expect(page.getByText("입력 항목을 추가했습니다.")).toBeVisible();
  });

  await test.step("새 매물 등록 화면에서 커스텀 카테고리를 고르면 추가한 입력 항목이 나온다", async () => {
    await page.getByRole("link", { name: "매물 목록" }).first().click();
    await page.getByRole("link", { name: "+ 매물 등록" }).click();
    const category = page.getByLabel(/^카테고리/);
    await expect(category.locator("option", { hasText: "창고형 상가" })).toHaveCount(1);
    await expect(page.getByText("카테고리를 선택하면 전용 입력 항목이 나타납니다.")).toBeVisible();
    await category.selectOption({ label: "창고형 상가" });
    await expect(page.getByLabel(/^층고/)).toBeVisible();
  });
});
