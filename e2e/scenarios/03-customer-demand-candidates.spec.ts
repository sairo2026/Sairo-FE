import { expect, test } from "@playwright/test";
import { useMockOfficeRole } from "../support/app";

// 개발플로우 4장 시나리오 3: 고객 등록 → 희망조건 입력 → 후보 매물 필터 조회
test.describe("시나리오 3 고객 등록부터 후보 매물 조회까지", () => {
  test("고객을 등록하고 희망조건을 저장한 뒤 후보 매물을 연다", async ({ page }) => {
    await useMockOfficeRole(page, "OWNER");

    await test.step("/customers/new에서 담당자·수집근거·목적·보유기한을 넣어 고객을 등록한다", async () => {
      await page.goto("/customers");
      await page.getByRole("link", { name: "+ 고객 등록" }).click();
      await expect(page.getByRole("heading", { name: "고객 등록" })).toBeVisible();
      await page.getByLabel(/^이름/).fill("신규고객");
      await page.getByLabel("연락처", { exact: true }).fill("01099998888");
      await page.getByLabel(/^담당 공인중개사/).selectOption("2");
      await page.getByLabel(/^수집 경로/).fill("전화 문의");
      await page.getByLabel(/^처리 근거/).selectOption("CONSENT");
      await page.getByLabel(/^수집 목적/).fill("매물 상담");
      await page.getByLabel(/^보유 기한/).fill("2029-11-10");
      await page.getByRole("button", { name: "등록", exact: true }).click();
      await expect(page).toHaveURL(/\/customers\/9\d\d$/);
      await expect(page.getByRole("heading", { level: 1, name: "신규고객" })).toBeVisible();
    });

    await test.step("희망조건 탭에서 매매 조건과 희망 지역을 저장한다", async () => {
      await page.getByRole("tab", { name: "희망조건" }).click();
      await expect(page.getByText("등록된 희망조건이 없습니다.")).toBeVisible();
      await page.getByRole("button", { name: "희망조건 추가" }).click();
      await page.getByLabel("거래유형").selectOption("SALE");
      await page.getByLabel("매매가 하한 (만원)").fill("10000");
      await page.getByLabel("희망 지역").fill("성북구, 종로구");
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect(page.getByText("희망조건을 등록했습니다.")).toBeVisible();
      await expect(page.getByText("성북구, 종로구")).toBeVisible();
    });

    await test.step("후보 매물 보기로 조건에 맞는 매물 목록을 연다", async () => {
      await page.getByRole("button", { name: "후보 매물 보기" }).click();
      await expect(page.getByText(/적합성을 보증하지 않습니다/)).toBeVisible();
      await expect(page.getByRole("link", { name: "국민대 앞 아파트" })).toBeVisible();
      await expect(page.getByRole("button", { name: "후보 매물 닫기" })).toBeVisible();
    });
  });

  test.fixme("후보 매물이 희망조건 값으로 걸러진다 (모의 API 공백: 후보 매물 조회가 조건과 관계없이 고정 목록을 돌려준다)", async () => {});
});
