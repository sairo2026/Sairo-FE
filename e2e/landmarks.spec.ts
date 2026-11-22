import { expect, test } from "@playwright/test";
import { settle, useMockOfficeRole } from "./support/app";
import { listAppRoutes } from "./support/routes";

// 없는 문의·요청 번호를 열면 오류 화면이 나오는데, 이 화면은 여러 화면 안에서도 쓰여 main을 직접 두지 않는다.
const ERROR_STATE_ROUTES = new Set(["/support/1", "/privacy-requests/1"]);

test.describe("화면의 주 영역", () => {
  test.skip(({ isMobile }) => isMobile, "폭과 무관한 구조 확인이라 데스크톱에서만 돈다.");

  for (const route of listAppRoutes().filter((item) => item.area !== "ops")) {
    if (ERROR_STATE_ROUTES.has(route.path)) continue;
    test(`${route.path} 에는 main이 하나만 있고 다른 main 안에 들어 있지 않다`, async ({
      page,
    }) => {
      if (route.area === "office") await useMockOfficeRole(page, "OWNER");
      await page.goto(route.path);
      await settle(page);
      await expect(page.locator("main, [role='main']")).toHaveCount(1);
      await expect(page.locator("main main, main [role='main'], [role='main'] main")).toHaveCount(
        0,
      );
    });
  }
});
