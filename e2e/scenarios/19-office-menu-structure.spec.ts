import { expect, test, type Page } from "@playwright/test";
import { useMockOfficeRole } from "../support/app";
import { fixMockClock } from "../support/scenario";

test.beforeEach(async ({ page }) => {
  await fixMockClock(page);
});

async function menuLabels(page: Page): Promise<(string | null)[]> {
  const menu = page.getByRole("navigation", { name: "주요 메뉴" });
  return menu.getByRole("link").evaluateAll((links) => links.map((link) => link.textContent));
}

async function tabLabels(page: Page, name: string): Promise<(string | null)[]> {
  const tabs = page.getByRole("navigation", { name });
  return tabs.getByRole("link").evaluateAll((links) => links.map((link) => link.textContent));
}

test.describe("사무소 왼쪽 메뉴 7개 구조", () => {
  test("대표는 메뉴 7개와 사무소 관리·데이터 관리 탭을 보고 기존 주소에서도 부모 메뉴가 선택된다", async ({
    page,
  }) => {
    await useMockOfficeRole(page, "OWNER");

    await test.step("왼쪽 메뉴는 일곱 개다", async () => {
      await page.goto("/home");
      await expect(page.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
      expect(await menuLabels(page)).toEqual([
        "홈 (오늘 할 일)",
        "매물 관리",
        "고객 관리",
        "방문 조율",
        "계약 관리",
        "데이터 관리",
        "사무소 관리",
      ]);
    });

    await test.step("/settlements는 사무소 관리의 월말결산 탭이 선택된다", async () => {
      await page.goto("/settlements");
      const menu = page.getByRole("navigation", { name: "주요 메뉴" });
      await expect(menu.getByRole("link", { name: "사무소 관리" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(await tabLabels(page, "사무소 관리 탭")).toEqual([
        "월말결산",
        "구성원",
        "사무소 정보",
        "인증",
        "구독·결제",
      ]);
      await expect(
        page.getByRole("navigation", { name: "사무소 관리 탭" }).getByRole("link", {
          name: "월말결산",
        }),
      ).toHaveAttribute("aria-current", "page");
    });

    await test.step("/billing/plans는 구독·결제 탭이 선택된 채로 열린다", async () => {
      await page.goto("/billing/plans");
      await expect(
        page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", {
          name: "사무소 관리",
        }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        page.getByRole("navigation", { name: "사무소 관리 탭" }).getByRole("link", {
          name: "구독·결제",
        }),
      ).toHaveAttribute("aria-current", "page");
    });

    await test.step("데이터 관리는 이전과 내보내기 탭이 있고 /import에서 이전 탭이 선택된다", async () => {
      await page.goto("/import");
      await expect(
        page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", {
          name: "데이터 관리",
        }),
      ).toHaveAttribute("aria-current", "page");
      expect(await tabLabels(page, "데이터 관리 탭")).toEqual(["데이터 이전", "데이터 내보내기"]);
      await expect(
        page.getByRole("navigation", { name: "데이터 관리 탭" }).getByRole("link", {
          name: "데이터 이전",
        }),
      ).toHaveAttribute("aria-current", "page");
    });

    await test.step("탭을 누르면 기존 주소로 이동한다", async () => {
      await page
        .getByRole("navigation", { name: "데이터 관리 탭" })
        .getByRole("link", { name: "데이터 내보내기" })
        .click();
      await expect(page).toHaveURL(/\/exports$/);
    });
  });

  test("중개보조원은 메뉴 3개를 보고 사무소 관리에서 구성원 탭만 본다", async ({ page }) => {
    await useMockOfficeRole(page, "DEPUTY");
    await page.goto("/home");
    await expect(page.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
    expect(await menuLabels(page)).toEqual(["홈 (오늘 할 일)", "방문 조율", "사무소 관리"]);

    await page.goto("/members");
    expect(await tabLabels(page, "사무소 관리 탭")).toEqual(["구성원"]);
    await expect(
      page.getByRole("navigation", { name: "사무소 관리 탭" }).getByRole("link", {
        name: "구성원",
      }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("탭을 숨겨도 주소 접근은 막힌다", async ({ page }) => {
    await useMockOfficeRole(page, "DEPUTY");
    await page.goto("/settlements");
    await expect(page.getByRole("navigation", { name: "사무소 관리 탭" })).toHaveCount(0);
    await page.goto("/import");
    await expect(page.getByRole("navigation", { name: "데이터 관리 탭" })).toHaveCount(0);
  });
});
